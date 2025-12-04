# 매번 INSERT 방식으로 되돌리기 구현 문서

## 개요
상태 변경 여부와 관계없이 매 health check마다 새 레코드를 INSERT하도록 변경하여 90 Day Uptime 그래프의 "No data" 문제를 해결한다.

## 핵심 구현 사항

### 1. `scripts/health_check.py` 수정

#### 1-1. `update_timestamp()` 함수 삭제
**위치**: Line 104-119

**삭제할 코드**:
```python
def update_timestamp(service_id: str) -> None:
    """Update timestamp of latest status log."""
    result = (
        supabase.table("service_status_logs")
        .select("id")
        .eq("service_id", service_id)
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )

    if result.data:
        log_id = result.data[0]["id"]
        supabase.table("service_status_logs").update(
            {"timestamp": datetime.now(timezone.utc).isoformat()}
        ).eq("id", log_id).execute()
```

#### 1-2. `main()` 함수 로직 수정
**위치**: Line 200-217

**현재 코드**:
```python
if status_changed:
    # 상태 변경: 새 로그 INSERT
    try:
        save_result(result)
        print(f"  -> Status saved to database")
    except Exception as e:
        print(f"  -> Failed to save to database: {e}")

    # WARN/ERROR일 때 알림 발송
    if result.status in ("WARN", "ERROR"):
        send_slack_notification(result, service)
else:
    # 상태 동일: 기존 로그 timestamp UPDATE
    try:
        update_timestamp(service["id"])
        print(f"  -> Timestamp updated")
    except Exception as e:
        print(f"  -> Failed to update timestamp: {e}")
```

**변경 후 코드**:
```python
# 매번 INSERT
try:
    save_result(result)
    print(f"  -> Status saved to database")
except Exception as e:
    print(f"  -> Failed to save to database: {e}")

# 상태 변경 시 WARN/ERROR면 알림 발송
if status_changed and result.status in ("WARN", "ERROR"):
    send_slack_notification(result, service)
```

## 코드 변경 요약

| 파일 | 변경 내용 | 라인 |
|------|----------|------|
| `scripts/health_check.py` | `update_timestamp()` 함수 삭제 | 104-119 |
| `scripts/health_check.py` | `main()` 로직 수정: 항상 INSERT | 200-217 |

## 기대 효과

1. **90 Day Uptime 그래프 정상 표시**: 모든 날짜에 데이터 존재
2. **상태 이력 완전성**: 모든 health check 기록 보존
3. **디버깅 용이성**: 전체 체크 이력 확인 가능
