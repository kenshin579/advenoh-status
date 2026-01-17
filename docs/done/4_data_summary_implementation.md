# 일별 상태 요약 테이블 도입 - 구현 문서

## 1. 구현 개요

health_check 실행 시 `daily_status_summary` 테이블에 일별 요약 데이터를 저장하고, 프론트엔드에서 이를 조회하여 Dashboard/History 페이지에 표시한다.

## 2. 파일 변경 사항

### 2.1 새 파일 생성

| 파일 | 설명 |
|------|------|
| `supabase/migrations/006_create_daily_status_summary.sql` | 테이블 생성 및 초기 데이터 마이그레이션 |

### 2.2 기존 파일 수정

| 파일 | 설명 |
|------|------|
| `scripts/health_check.py` | `update_daily_summary()` 함수 추가 |
| `src/hooks/useServices.ts` | `useUptimeData()` → summary 테이블 조회로 변경 |
| `src/components/UptimeGrid.tsx` | summary 데이터 구조에 맞게 수정 |
| `src/components/MonthlyCalendar.tsx` | summary 데이터 구조에 맞게 수정 |
| `src/components/DayDetailPanel.tsx` | summary 데이터 구조에 맞게 수정 |
| `src/types/index.ts` | `DailyStatusSummary` 타입 추가 |

## 3. 구현 상세

### 3.1 Migration SQL

```sql
-- supabase/migrations/006_create_daily_status_summary.sql

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
  ON daily_status_summary FOR SELECT USING (true);

CREATE POLICY "Service role can manage daily_status_summary"
  ON daily_status_summary FOR ALL USING (true);

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
# main() 함수 내에서 save_result() 호출 후 추가
update_daily_summary(result)

def update_daily_summary(result: CheckResult) -> None:
    """Update daily status summary."""
    today = datetime.now(timezone.utc).date().isoformat()

    existing = supabase.table("daily_status_summary").select("*").eq(
        "service_id", result.service_id
    ).eq("date", today).execute()

    if existing.data:
        row = existing.data[0]
        new_ok = row["ok_count"] + (1 if result.status == "OK" else 0)
        new_warn = row["warn_count"] + (1 if result.status == "WARN" else 0)
        new_error = row["error_count"] + (1 if result.status == "ERROR" else 0)

        # worst status 계산
        if new_error > 0:
            new_status = "ERROR"
        elif new_warn > 0:
            new_status = "WARN"
        else:
            new_status = "OK"

        # 평균 응답시간 재계산
        total_count = new_ok + new_warn + new_error
        prev_total = row["ok_count"] + row["warn_count"] + row["error_count"]
        new_avg = ((row["avg_response_time"] or 0) * prev_total + result.response_time) // total_count

        supabase.table("daily_status_summary").update({
            "ok_count": new_ok,
            "warn_count": new_warn,
            "error_count": new_error,
            "status": new_status,
            "avg_response_time": new_avg,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", row["id"]).execute()
    else:
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

### 3.3 TypeScript 타입 추가

```typescript
// src/types/index.ts
export interface DailyStatusSummary {
  id: string;
  service_id: string;
  date: string;
  status: StatusType;
  ok_count: number;
  warn_count: number;
  error_count: number;
  avg_response_time: number | null;
  updated_at: string;
  services?: { name: string; url: string };
}
```

### 3.4 useServices.ts 수정

```typescript
// useUptimeData 반환 타입 변경
export type SummaryByDate = Map<string, DailyStatusSummary[]>;

export function useUptimeData(days: number = 90) {
  const [data, setData] = useState<DailyStatusSummary[]>([]);
  const [summaryByDate, setSummaryByDate] = useState<SummaryByDate>(new Map());
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

      const summaryData = (summary as DailyStatusSummary[]) || [];

      // 날짜별 Map 생성
      const dateMap = new Map<string, DailyStatusSummary[]>();
      summaryData.forEach((item) => {
        if (!dateMap.has(item.date)) {
          dateMap.set(item.date, []);
        }
        dateMap.get(item.date)!.push(item);
      });

      setData(summaryData);
      setSummaryByDate(dateMap);
      setLoading(false);
    }

    fetchUptimeData();
  }, [days, supabase]);

  return { data, summaryByDate, loading };
}
```

### 3.5 UptimeGrid.tsx 수정

```typescript
interface UptimeGridProps {
  summaryByDate: SummaryByDate;
  days?: number;
}

export default function UptimeGrid({ summaryByDate, days = 90 }: UptimeGridProps) {
  const getDailyStatus = (date: Date): StatusType | 'NONE' => {
    const dateStr = date.toISOString().split('T')[0];
    const daySummary = summaryByDate.get(dateStr) ?? [];

    if (daySummary.length === 0) return 'NONE';
    if (daySummary.some((s) => s.status === 'ERROR')) return 'ERROR';
    if (daySummary.some((s) => s.status === 'WARN')) return 'WARN';
    return 'OK';
  };

  // ... 나머지 동일
}
```

### 3.6 MonthlyCalendar.tsx 수정

```typescript
interface MonthlyCalendarProps {
  summaryByDate: SummaryByDate;
  months?: number;
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
}

// getDayStatus 로직을 summary 데이터 사용하도록 변경
```

### 3.7 DayDetailPanel.tsx 수정

```typescript
interface DayDetailPanelProps {
  selectedDate: Date | null;
  summaryByDate: SummaryByDate;
}

// summary 데이터에서 ok_count, warn_count, error_count, avg_response_time 표시
```

## 4. 적용 방법

### 4.1 Supabase Dashboard에서 Migration 실행
1. Supabase Dashboard > SQL Editor
2. `006_create_daily_status_summary.sql` 내용 실행

### 4.2 프론트엔드 배포
1. 코드 변경 후 commit/push
2. Netlify 자동 배포
