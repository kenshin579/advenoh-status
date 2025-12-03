# notification_channels 테이블 제거 - 구현

## 1. 데이터베이스 마이그레이션

**파일**: `supabase/migrations/002_drop_notification_channels.sql`

```sql
-- notification_channels 테이블 제거
DROP POLICY IF EXISTS "Authenticated users can read channels" ON notification_channels;
DROP TABLE IF EXISTS notification_channels;
```

**실행 방법**: Supabase 대시보드 SQL Editor에서 직접 실행

---

## 2. TypeScript 타입 제거

**파일**: `src/types/index.ts`

### 제거할 코드

```typescript
// 삭제: NotificationChannel 인터페이스 (Line 26-32)
export interface NotificationChannel {
  id: string;
  type: 'slack';
  target: string;
  enabled: boolean;
  created_at: string;
}

// 삭제: Database 타입 내 notification_channels (Line 48-52)
notification_channels: {
  Row: NotificationChannel;
  Insert: Omit<NotificationChannel, 'id' | 'created_at'>;
  Update: Partial<Omit<NotificationChannel, 'id' | 'created_at'>>;
};
```

---

## 3. 문서 정리

| 파일 | 제거할 내용 |
|------|------------|
| `CLAUDE.md` | Line 77: `- notification_channels - Slack webhook config` |
| `docs/start/1_status_todo.md` | Line 18: notification_channels 테이블 생성 항목 |
| `docs/start/1_status_prd.md` | Line 170 부근: `### Table: notification_channels` 섹션 |
| `docs/start/1_status_implementation.md` | Line 92-139: notification_channels SQL 및 RLS 관련 코드 |
