# 매번 INSERT 방식으로 되돌리기 PRD

## 문제 정의

### 현재 상황
이전 개선(3_time_prd.md)에서 상태가 동일할 때 timestamp만 UPDATE하는 방식으로 변경됨:

```python
# health_check.py (현재 로직)
if status_changed:
    save_result(result)  # INSERT
else:
    update_timestamp(service["id"])  # 기존 레코드의 timestamp만 UPDATE
```

### 발생한 문제
**90 Day Uptime 그래프에 데이터가 없는 것처럼 표시됨**

UptimeGrid 컴포넌트의 로직:
```typescript
// UptimeGrid.tsx:21-22
const dayLogs = data.filter((log) => log.timestamp.startsWith(dateStr));
if (dayLogs.length === 0) return 'NONE';  // No data로 표시
```

**예시 시나리오:**
1. 12월 1일: OK 상태로 레코드 INSERT (timestamp: 2025-12-01T09:00:00)
2. 12월 2일~4일: 상태 계속 OK → timestamp만 UPDATE (timestamp: 2025-12-04T09:00:00)
3. **결과**: 12월 1일 레코드의 timestamp가 12월 4일로 변경됨
4. **UptimeGrid**: 12월 1일, 2일, 3일 조회 시 해당 날짜로 시작하는 레코드 없음 → "No data"

---

## 해결 방안

### 변경 내용: 매번 INSERT 방식으로 되돌리기

상태 변경 여부와 관계없이 **매 health check마다 새 레코드를 INSERT**

| 항목 | 현재 (문제) | 변경 후 |
|-----|-----------|--------|
| 상태 변경 시 | INSERT | INSERT |
| 상태 동일 시 | UPDATE (timestamp만) | INSERT |

---

## 영향 범위

### 1. scripts/health_check.py

**삭제할 코드:**
```python
# Line 104-119: update_timestamp 함수 전체 삭제
def update_timestamp(service_id: str) -> None:
    """Update timestamp of latest status log."""
    ...
```

**수정할 코드:**
```python
# Line 200-217: main() 함수 로직 수정
# Before
if status_changed:
    save_result(result)
    if result.status in ("WARN", "ERROR"):
        send_slack_notification(result, service)
else:
    update_timestamp(service["id"])

# After
save_result(result)  # 상태 변경 여부와 관계없이 항상 INSERT
if status_changed and result.status in ("WARN", "ERROR"):
    send_slack_notification(result, service)
```

---

## 코드 변경 요약

| 파일 | 변경 내용 | 라인 |
|------|----------|------|
| `scripts/health_check.py` | `update_timestamp()` 함수 삭제 | 104-119 |
| `scripts/health_check.py` | main() 로직 수정: 항상 INSERT | 200-217 |

---

## 고려사항

### DB 용량 증가
- 5분마다 INSERT → 하루 288개 레코드/서비스
- 2개 서비스 기준 월간 약 17,000 레코드 추가
- 현실적으로 문제 없는 수준 (Supabase free tier 충분)

### 대안 검토 (권장하지 않음)

**Option A: UptimeGrid 로직 변경**
- 각 날짜의 "가장 가까운" 레코드를 찾도록 변경
- 복잡도 증가, 성능 저하 가능성

**Option B: 하루에 한 번만 INSERT**
- cron 주기 조정 필요
- Last checked 실시간 업데이트 불가

→ **단순히 매번 INSERT가 가장 직관적이고 안정적인 해결책**

---

## 기대 효과

1. 90 Day Uptime 그래프가 정상적으로 모든 날짜 표시
2. 상태 이력 데이터 완전성 확보
3. 디버깅/분석 시 모든 health check 기록 확인 가능
