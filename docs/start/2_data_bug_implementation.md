# Dashboard/History 데이터 미표시 버그 수정 - 구현 문서

## 개요

PostgreSQL timestamp 형식과 JavaScript Date 파싱 불일치로 인한 데이터 미표시 버그 수정

## 핵심 변경 사항

### 1. dateUtils.ts - parseTimestamp 함수 추가

**파일**: `src/lib/dateUtils.ts`

```typescript
/**
 * PostgreSQL timestamp 문자열을 Date 객체로 변환
 * '2025-12-28 06:07:09.312465+00' → Date 객체
 *
 * PostgreSQL 형식과 ISO 8601 형식의 차이를 처리:
 * - 공백 → T
 * - +00 → +00:00
 */
export const parseTimestamp = (timestamp: string): Date => {
  const isoString = timestamp
    .replace(' ', 'T')
    .replace(/([+-]\d{2})$/, '$1:00');
  return new Date(isoString);
};
```

### 2. UptimeGrid.tsx - parseTimestamp 적용

**파일**: `src/components/UptimeGrid.tsx`

**변경 위치**: `getDailyStatus` 함수 내 timestamp 파싱

```typescript
import { toLocalDateString, parseTimestamp } from '@/lib/dateUtils';

const getDailyStatus = (date: Date): StatusType | 'NONE' => {
  const dateStr = toLocalDateString(date);
  const dayLogs = data.filter((log) => {
    const logDate = parseTimestamp(log.timestamp);  // 변경
    return toLocalDateString(logDate) === dateStr;
  });
  // ...
};
```

### 3. MonthlyCalendar.tsx - parseTimestamp 적용

**파일**: `src/components/MonthlyCalendar.tsx`

**변경 위치**: `getDailyStatus` 함수 내 timestamp 파싱

```typescript
import { toLocalDateString, parseTimestamp } from '@/lib/dateUtils';

const getDailyStatus = (date: Date): StatusType | 'NONE' => {
  const dateStr = toLocalDateString(date);
  const dayLogs = data.filter((log) => {
    const logDate = parseTimestamp(log.timestamp);  // 변경
    return toLocalDateString(logDate) === dateStr;
  });
  // ...
};
```

### 4. DayDetailPanel.tsx - parseTimestamp 적용

**파일**: `src/components/DayDetailPanel.tsx`

timestamp를 파싱하는 모든 위치에 `parseTimestamp` 적용

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/dateUtils.ts` | `parseTimestamp` 함수 추가 |
| `src/components/UptimeGrid.tsx` | import 추가, `new Date()` → `parseTimestamp()` |
| `src/components/MonthlyCalendar.tsx` | import 추가, `new Date()` → `parseTimestamp()` |
| `src/components/DayDetailPanel.tsx` | import 추가, `new Date()` → `parseTimestamp()` (해당 시) |

## 테스트 방법

1. **로컬 개발 서버 실행**: `npm run dev`
2. **Dashboard 페이지**: 90 Day Uptime 그리드에서 12/27, 28 날짜에 색상 표시 확인
3. **History 페이지**: 캘린더에서 12/27, 28 날짜에 색상 표시 확인
4. **MCP Playwright**: 자동화 테스트로 UI 검증
