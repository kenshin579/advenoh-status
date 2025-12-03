# Last Checked 시간 업데이트 구현 문서

## 개요

상태 변경 여부와 관계없이 매 health check 실행 시 Last checked 시간이 갱신되도록 개선

## 구현 상세

### 1. DB 마이그레이션

**파일**: `supabase/migrations/002_add_last_checked_at.sql`

```sql
-- services 테이블에 last_checked_at 컬럼 추가
ALTER TABLE services
ADD COLUMN last_checked_at TIMESTAMPTZ;

-- 기존 데이터: service_status_logs의 최신 timestamp로 초기화
UPDATE services s
SET last_checked_at = (
  SELECT MAX(timestamp)
  FROM service_status_logs ssl
  WHERE ssl.service_id = s.id
);
```

### 2. Python 스크립트 수정

**파일**: `scripts/health_check.py`

```python
from datetime import datetime, timezone

def update_last_checked(service_id: str) -> None:
    """Update last_checked_at timestamp for service."""
    supabase.table("services").update(
        {"last_checked_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", service_id).execute()
```

**main() 함수 수정**:
```python
for service in services:
    result = check_service(service)
    previous_status = get_previous_status(service["id"])
    status_changed = result.status != previous_status

    # 항상 last_checked_at 업데이트
    update_last_checked(service["id"])

    # 상태 변경 시에만 로그 저장
    if status_changed:
        save_result(result)
        if result.status in ("WARN", "ERROR"):
            send_slack_notification(result, service)
```

### 3. TypeScript 타입 수정

**파일**: `src/types/index.ts`

```typescript
export interface Service {
  id: string;
  name: string;
  url: string;
  threshold_ms: number;
  created_at: string;
  last_checked_at: string | null;  // 추가
}
```

### 4. Hook 수정

**파일**: `src/hooks/useServices.ts`

```typescript
// 변경 전: service_status_logs에서 timestamp 조회
// 변경 후: services.last_checked_at 직접 사용

const servicesWithStatus = await Promise.all(
  ((servicesData as Service[]) || []).map(async (service) => {
    const { data: logs } = await supabase
      .from('service_status_logs')
      .select('status')  // timestamp 제거
      .eq('service_id', service.id)
      .order('timestamp', { ascending: false })
      .limit(1);

    const logData = logs as { status: StatusType }[] | null;

    return {
      ...service,
      currentStatus: logData?.[0]?.status || 'OK',
      lastChecked: service.last_checked_at,  // 변경
    } as ServiceWithStatus;
  })
);
```

## 데이터 흐름

```
health_check.py 실행 (5분마다)
    │
    ├─► update_last_checked() ─► services.last_checked_at UPDATE (항상)
    │
    └─► 상태 변경 시 ─► service_status_logs INSERT
```

## Supabase 적용 방법

Supabase Dashboard에서 SQL Editor를 통해 마이그레이션 실행:

1. Supabase Dashboard 접속
2. SQL Editor 메뉴 선택
3. 마이그레이션 SQL 실행
