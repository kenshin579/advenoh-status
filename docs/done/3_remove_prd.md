# notification_channels 테이블 제거 작업

## 배경

`notification_channels` 테이블은 초기 설계에서 Slack Webhook URL을 DB에 저장하여 관리하려는 목적으로 생성되었으나,
실제 구현에서는 **환경변수 기반 Slack WebClient 방식**으로 전환되어 현재 사용되지 않는 상태입니다.

### 설계 vs 현재 구현

| 항목 | 원래 설계 | 현재 구현 |
|------|----------|----------|
| 알림 채널 관리 | DB `notification_channels` 테이블 | 환경변수 |
| Slack 방식 | Webhook URL (`target` 컬럼) | WebClient (Bot Token + Channel ID) |
| 채널 활성화 | `enabled` 컬럼 | 환경변수 존재 여부 |

## 제거 대상 파일 및 작업

### 1. 데이터베이스 (Supabase)

**파일**: `supabase/migrations/002_drop_notification_channels.sql` (신규 생성)

```sql
-- notification_channels 테이블 제거
DROP POLICY IF EXISTS "Authenticated users can read channels" ON notification_channels;
DROP TABLE IF EXISTS notification_channels;
```

**작업**: Supabase 대시보드에서 마이그레이션 실행 또는 직접 SQL 실행

---

### 2. TypeScript 타입 정의

**파일**: `src/types/index.ts`

**제거할 코드**:
- Line 26-32: `NotificationChannel` 인터페이스
- Line 48-52: `Database.public.Tables.notification_channels` 타입

---

### 3. 문서 업데이트

#### CLAUDE.md
**위치**: Line 77
**작업**: `- notification_channels - Slack webhook config` 라인 삭제

#### docs/start/1_status_todo.md
**위치**: Line 18
**작업**: `- [x] notification_channels 테이블 생성` 라인 삭제 또는 취소선 처리

#### docs/start/1_status_prd.md
**위치**: Line 170 부근
**작업**: `### Table: notification_channels` 섹션 삭제

#### docs/start/1_status_implementation.md
**위치**: Line 92-139 부근
**작업**: `notification_channels` 관련 SQL 및 설명 삭제

## 참고

- 현재 Slack 알림은 `scripts/health_check.py`에서 환경변수 기반으로 동작
  - `ADVENOH_STATUS_SLACK_BOT_TOKEN`
  - `ADVENOH_STATUS_SLACK_CHANNEL_ID`
- 향후 다중 채널 지원이 필요하면 그때 다시 설계 가능

## 관련 문서

- [3_remove_implementation.md](3_remove_implementation.md) - 구현 상세
- [3_remove_todo.md](3_remove_todo.md) - 작업 체크리스트
