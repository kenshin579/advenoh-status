# Dashboard/History 페이지 데이터 미표시 버그 분석

## 문제 현상

- DB에 12/27, 12/28 데이터가 존재함 (확인됨: 12/28 28건, 12/27 96건)
- Dashboard의 90 Day Uptime 그리드에서 해당 날짜가 회색(No data)으로 표시
- History 캘린더에서도 해당 날짜가 회색(No data)으로 표시

## 원인 (확정)

### PostgreSQL timestamp 형식과 JavaScript Date 파싱 불일치

**DB에서 반환되는 timestamp 형식:**
```
2025-12-28 06:07:09.312465+00
```

**JavaScript가 기대하는 ISO 8601 형식:**
```
2025-12-28T06:07:09.312465+00:00
```

**차이점:**
| 항목 | PostgreSQL | ISO 8601 |
|------|-----------|----------|
| 날짜/시간 구분자 | 공백 (` `) | `T` |
| 타임존 형식 | `+00` | `+00:00` |

**결과:**
```javascript
new Date('2025-12-28 06:07:09.312465+00')
// 일부 브라우저(Safari 등)에서 Invalid Date 반환
// Chrome에서도 불안정할 수 있음

new Date('2025-12-28T06:07:09.312465+00:00')
// 모든 브라우저에서 정상 작동
```

## 영향받는 코드

### 데이터 흐름

```
Supabase DB (TIMESTAMPTZ, UTC)
    ↓
useUptimeData() hook
    ↓
UptimeGrid / MonthlyCalendar
    ↓ getDailyStatus() → new Date(log.timestamp) ← 문제 발생 지점
UI 렌더링
```

### 관련 파일

| 파일 | 역할 |
|------|------|
| [useServices.ts:57-84](../../src/hooks/useServices.ts#L57-L84) | Supabase 쿼리 |
| [dateUtils.ts](../../src/lib/dateUtils.ts) | 날짜 변환 유틸리티 |
| [UptimeGrid.tsx:20-31](../../src/components/UptimeGrid.tsx#L20-L31) | 일별 상태 계산 |
| [MonthlyCalendar.tsx:23-34](../../src/components/MonthlyCalendar.tsx#L23-L34) | 캘린더 일별 상태 계산 |

## 해결 방안

`dateUtils.ts`에 `parseTimestamp()` 함수를 추가하고, timestamp를 파싱하는 모든 곳에서 사용:

```typescript
export const parseTimestamp = (timestamp: string): Date => {
  const isoString = timestamp
    .replace(' ', 'T')
    .replace(/([+-]\d{2})$/, '$1:00');
  return new Date(isoString);
};
```

**상세 구현**: [2_data_bug_implementation.md](./2_data_bug_implementation.md)
**작업 목록**: [2_data_bug_todo.md](./2_data_bug_todo.md)
