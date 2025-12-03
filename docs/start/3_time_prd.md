# Last Checked 시간 업데이트 개선 PRD

## 문제 정의

### 현재 상황
- `health_check.py`는 상태 변경(OK → WARN, WARN → ERROR 등)이 발생할 때만 `service_status_logs` 테이블에 insert
- UI의 "Last checked" 시간은 `service_status_logs`의 최신 `timestamp`를 표시
- 상태가 동일하면 DB insert가 없으므로 **Last checked 시간이 갱신되지 않음**

### 사용자 관점 문제
- 5분마다 health check가 실행되지만, 상태가 계속 OK면 Last checked가 며칠 전으로 표시됨
- 사용자가 "모니터링이 제대로 동작하지 않는다"고 오해할 수 있음

---

## 코드 분석

### 1. health_check.py (Python 스크립트)
```python
# Line 181-184: 상태 변경 시에만 저장
if status_changed:
    save_result(result)
```

### 2. useServices.ts (프론트엔드 Hook)
```typescript
// Line 26-31: service_status_logs에서 최신 timestamp 조회
const { data: logs } = await supabase
  .from('service_status_logs')
  .select('status, timestamp')
  .order('timestamp', { ascending: false })
  .limit(1);

// Line 38: lastChecked에 할당
lastChecked: logData?.[0]?.timestamp || null,
```

### 3. DB 스키마 (services 테이블)
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  threshold_ms INT DEFAULT 3000,
  created_at TIMESTAMPTZ DEFAULT now()
  -- last_checked_at 컬럼 없음
);
```

---

## 해결 방안

### 권장안: services 테이블에 last_checked_at 컬럼 추가

상태 로그(`service_status_logs`)는 **상태 변경 이력**만 보관하고,
마지막 체크 시간은 `services.last_checked_at`에서 관리.

---

## 영향 범위

| 파일 | 변경 내용 |
|------|----------|
| `supabase/migrations/002_add_last_checked_at.sql` | 신규 생성 |
| `scripts/health_check.py` | `update_last_checked()` 추가, main() 수정 |
| `src/types/index.ts` | `Service` 타입에 `last_checked_at` 추가 |
| `src/hooks/useServices.ts` | `lastChecked` 조회 로직 변경 |

---

## 기대 효과

1. Last checked 시간이 매 health check(5분) 마다 갱신됨
2. 상태 변경 로그(`service_status_logs`)는 이력 용도로만 사용
3. DB 용량 증가 없이 문제 해결 (매번 INSERT 대신 UPDATE)
