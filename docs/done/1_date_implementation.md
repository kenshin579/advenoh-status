# 날짜 표시 오류 수정 - 구현 문서

## 수정 대상 파일

| 파일 | 수정 내용 |
|------|----------|
| `src/lib/dateUtils.ts` | 공통 유틸리티 함수 생성 (신규) |
| `src/components/MonthlyCalendar.tsx` | `getDailyStatus()` 수정 |
| `src/components/UptimeGrid.tsx` | `getDailyStatus()` 수정 |

## 구현 상세

### 1. 공통 유틸리티 함수 생성

**파일**: `src/lib/dateUtils.ts`

```typescript
/**
 * Date 객체를 로컬 타임존 기준 YYYY-MM-DD 문자열로 변환
 * toISOString()은 UTC로 변환되므로 사용하지 않음
 */
export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

### 2. MonthlyCalendar.tsx 수정

**수정 전** (라인 20-22):
```typescript
const getDailyStatus = (date: Date): StatusType | 'NONE' => {
  const dateStr = date.toISOString().split('T')[0];
  const dayLogs = data.filter((log) => log.timestamp.startsWith(dateStr));
```

**수정 후**:
```typescript
import { toLocalDateString } from '@/lib/dateUtils';

const getDailyStatus = (date: Date): StatusType | 'NONE' => {
  const dateStr = toLocalDateString(date);
  const dayLogs = data.filter((log) => {
    const logDate = new Date(log.timestamp);
    return toLocalDateString(logDate) === dateStr;
  });
```

### 3. UptimeGrid.tsx 수정

**수정 전** (라인 19-21):
```typescript
const getDailyStatus = (date: Date): StatusType | 'NONE' => {
  const dateStr = date.toISOString().split('T')[0];
  const dayLogs = data.filter((log) => log.timestamp.startsWith(dateStr));
```

**수정 후**:
```typescript
import { toLocalDateString } from '@/lib/dateUtils';

const getDailyStatus = (date: Date): StatusType | 'NONE' => {
  const dateStr = toLocalDateString(date);
  const dayLogs = data.filter((log) => {
    const logDate = new Date(log.timestamp);
    return toLocalDateString(logDate) === dateStr;
  });
```

## 동작 원리

```
┌─────────────────────────────────────────────────────────────┐
│ 캘린더 날짜: new Date(2025, 11, 9)                           │
│ → KST 2025-12-09 00:00:00                                   │
│ → toLocalDateString() = "2025-12-09"                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ DB timestamp: "2025-12-09T09:06:57Z" (UTC)                  │
│ → new Date() = KST 2025-12-09 18:06:57                      │
│ → toLocalDateString() = "2025-12-09"                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ "2025-12-09" === "2025-12-09" ✅ 정확히 매칭                 │
└─────────────────────────────────────────────────────────────┘
```

## 테스트 방법

1. 로컬 개발 서버 실행: `npm run dev`
2. Dashboard 페이지에서 90 Day Uptime 그리드 확인
3. History 페이지에서 월별 캘린더 확인
4. 오늘 날짜 칸에 오늘 데이터가 표시되는지 확인
5. MCP Playwright로 시각적 검증
