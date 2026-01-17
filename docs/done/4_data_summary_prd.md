# 일별 상태 요약 테이블 도입 PRD

## 1. 배경

### 현재 구조의 문제점

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│ GitHub Actions  │────▶│ service_status_logs      │────▶│ Frontend        │
│ (5분마다)       │     │ (raw 데이터)             │     │ (전체 조회)     │
└─────────────────┘     │ 3,479+ rows              │     └─────────────────┘
                        └──────────────────────────┘
                                    │
                                    ▼
                        ┌──────────────────────────┐
                        │ 프론트엔드에서 처리      │
                        │ - 날짜별 그룹핑          │
                        │ - 상태 집계 (worst)      │
                        │ - limit 1000 문제 발생   │
                        └──────────────────────────┘
```

| 문제 | 설명 |
|-----|------|
| **Supabase limit** | 기본 1000행 제한으로 과거 데이터 누락 |
| **불필요한 데이터 전송** | 90일 × 5서비스 × 288회/일 = 129,600행 (최대) |
| **클라이언트 부하** | 프론트엔드에서 날짜별 그룹핑 및 집계 수행 |
| **쿼리 비효율** | 매번 전체 raw 데이터 조회 |

### 제안: 일별 요약 테이블

```
┌─────────────────┐     ┌──────────────────────────┐
│ GitHub Actions  │────▶│ service_status_logs      │ (raw, 상세 조회용)
│ (5분마다)       │     └──────────────────────────┘
│                 │
│                 │     ┌──────────────────────────┐     ┌─────────────────┐
│                 │────▶│ daily_status_summary     │────▶│ Frontend        │
│                 │     │ (요약 데이터)            │     │ (요약만 조회)   │
└─────────────────┘     │ 90일 × 5서비스 = 450 rows│     └─────────────────┘
                        └──────────────────────────┘
```

## 2. 요구사항

### 2.1 새 테이블: `daily_status_summary`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| service_id | uuid | FK → services.id |
| date | date | 날짜 (YYYY-MM-DD) |
| status | text | 일별 최종 상태 (OK/WARN/ERROR) |
| ok_count | int | OK 횟수 |
| warn_count | int | WARN 횟수 |
| error_count | int | ERROR 횟수 |
| avg_response_time | int | 평균 응답 시간 (ms) |
| updated_at | timestamptz | 마지막 업데이트 |

**Unique 제약조건**: `(service_id, date)`

### 2.2 상태 결정 로직

일별 상태는 "worst status" 기준:
```
ERROR가 1개라도 있음 → ERROR
WARN이 1개라도 있음 → WARN
모두 OK → OK
```

### 2.3 health_check.py 수정

health check 실행 시:
1. `service_status_logs`에 raw 데이터 저장 (기존)
2. `daily_status_summary`에 오늘 날짜 summary UPSERT (신규)

### 2.4 프론트엔드 수정

```typescript
// Before: raw 데이터 전체 조회 후 클라이언트에서 집계
const { data: logs } = await supabase
  .from('service_status_logs')
  .select('*, services:service_id(name)')
  .gte('timestamp', startDate)
  .limit(10000);  // limit 문제 발생

// After: summary 테이블 직접 조회
const { data: summary } = await supabase
  .from('daily_status_summary')
  .select('*, services:service_id(name)')
  .gte('date', startDate);  // 450행 이하, limit 문제 없음
```

## 3. 구현 상세

### 3.1 Migration SQL

```sql
-- 006_create_daily_status_summary.sql

-- 1. 테이블 생성
CREATE TABLE daily_status_summary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('OK', 'WARN', 'ERROR')),
  ok_count int DEFAULT 0,
  warn_count int DEFAULT 0,
  error_count int DEFAULT 0,
  avg_response_time int,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(service_id, date)
);

-- 2. 인덱스
CREATE INDEX idx_daily_status_summary_date ON daily_status_summary(date);
CREATE INDEX idx_daily_status_summary_service_date ON daily_status_summary(service_id, date);

-- 3. RLS 정책
ALTER TABLE daily_status_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily_status_summary"
  ON daily_status_summary FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert/update daily_status_summary"
  ON daily_status_summary FOR ALL
  USING (true);

-- 4. 기존 데이터로 초기 summary 생성
INSERT INTO daily_status_summary (service_id, date, status, ok_count, warn_count, error_count, avg_response_time)
SELECT
  service_id,
  DATE(timestamp) as date,
  CASE
    WHEN COUNT(*) FILTER (WHERE status = 'ERROR') > 0 THEN 'ERROR'
    WHEN COUNT(*) FILTER (WHERE status = 'WARN') > 0 THEN 'WARN'
    ELSE 'OK'
  END as status,
  COUNT(*) FILTER (WHERE status = 'OK') as ok_count,
  COUNT(*) FILTER (WHERE status = 'WARN') as warn_count,
  COUNT(*) FILTER (WHERE status = 'ERROR') as error_count,
  AVG(response_time)::int as avg_response_time
FROM service_status_logs
GROUP BY service_id, DATE(timestamp)
ON CONFLICT (service_id, date) DO NOTHING;
```

### 3.2 health_check.py 수정

```python
def update_daily_summary(result: CheckResult) -> None:
    """Update daily status summary."""
    today = datetime.now(timezone.utc).date().isoformat()

    # 오늘의 summary 조회
    existing = supabase.table("daily_status_summary").select("*").eq(
        "service_id", result.service_id
    ).eq("date", today).execute()

    if existing.data:
        # UPDATE: 카운트 증가 및 상태 재계산
        row = existing.data[0]
        new_counts = {
            "ok_count": row["ok_count"] + (1 if result.status == "OK" else 0),
            "warn_count": row["warn_count"] + (1 if result.status == "WARN" else 0),
            "error_count": row["error_count"] + (1 if result.status == "ERROR" else 0),
        }

        # worst status 계산
        if new_counts["error_count"] > 0:
            new_status = "ERROR"
        elif new_counts["warn_count"] > 0:
            new_status = "WARN"
        else:
            new_status = "OK"

        supabase.table("daily_status_summary").update({
            **new_counts,
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", row["id"]).execute()
    else:
        # INSERT: 새 레코드
        supabase.table("daily_status_summary").insert({
            "service_id": result.service_id,
            "date": today,
            "status": result.status,
            "ok_count": 1 if result.status == "OK" else 0,
            "warn_count": 1 if result.status == "WARN" else 0,
            "error_count": 1 if result.status == "ERROR" else 0,
            "avg_response_time": result.response_time,
        }).execute()
```

### 3.3 프론트엔드 useServices.ts 수정

```typescript
export function useUptimeData(days: number = 90) {
  const [data, setData] = useState<DailyStatusSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchUptimeData() {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: summary } = await supabase
        .from('daily_status_summary')
        .select('*, services:service_id(name, url)')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      setData(summary || []);
      setLoading(false);
    }

    fetchUptimeData();
  }, [days, supabase]);

  return { data, loading };
}
```

## 4. 비교

| 항목 | Before (raw) | After (summary) |
|------|-------------|-----------------|
| 데이터 양 (90일) | ~3,500+ rows | ~450 rows |
| Supabase limit 문제 | 있음 | 없음 |
| 클라이언트 처리 | 날짜별 그룹핑 필요 | 바로 사용 가능 |
| 쿼리 성능 | 느림 | 빠름 |
| 추가 정보 | 없음 | ok/warn/error 카운트, 평균 응답시간 |

## 5. 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `supabase/migrations/006_create_daily_status_summary.sql` | 테이블 생성 |
| `scripts/health_check.py` | `update_daily_summary()` 함수 추가 |
| `src/hooks/useServices.ts` | `useUptimeData()` 수정 |
| `src/components/UptimeGrid.tsx` | summary 데이터 사용하도록 수정 |
| `src/components/MonthlyCalendar.tsx` | summary 데이터 사용하도록 수정 |
| `src/types/index.ts` | `DailyStatusSummary` 타입 추가 |

## 6. 테스트 시나리오

| # | 시나리오 | 예상 결과 |
|---|---------|----------|
| 1 | Migration 실행 | 기존 데이터로 summary 테이블 초기화 |
| 2 | health_check 실행 | raw + summary 모두 업데이트 |
| 3 | Dashboard 90일 그리드 | 모든 날짜에 상태 표시 (회색 없음) |
| 4 | History 월별 캘린더 | 모든 날짜에 상태 표시 |
| 5 | 서비스 삭제 | CASCADE로 summary도 함께 삭제 |
