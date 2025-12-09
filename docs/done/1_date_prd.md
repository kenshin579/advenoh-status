# 날짜 표시 오류 분석 (12월 10일 데이터가 미리 표시되는 문제)

## 문제 현상

- 오늘 날짜: 2025년 12월 9일
- Dashboard의 90 Day Uptime 그리드와 History 페이지의 월별 캘린더에서 12월 10일에 데이터가 있는 것처럼 표시됨
- 실제로는 12월 9일까지만 데이터가 존재해야 함

## 근본 원인

**타임존 변환 불일치 문제**

### 문제가 되는 코드 패턴

[MonthlyCalendar.tsx:21](src/components/MonthlyCalendar.tsx#L21)와 [UptimeGrid.tsx:20](src/components/UptimeGrid.tsx#L20)에서 동일한 문제 발생:

```typescript
const getDailyStatus = (date: Date): StatusType | 'NONE' => {
  const dateStr = date.toISOString().split('T')[0];  // 문제 지점!
  const dayLogs = data.filter((log) => log.timestamp.startsWith(dateStr));
  // ...
};
```

### 왜 문제인가?

1. **캘린더 날짜 생성 (로컬 시간 기준)**
   - `new Date(2025, 11, 10)` → KST 2025-12-10 00:00:00

2. **toISOString() 변환 (UTC 기준으로 변환됨)**
   - KST 2025-12-10 00:00:00 → UTC 2025-12-09 15:00:00
   - `toISOString().split('T')[0]` = `"2025-12-09"`

3. **결과적으로**
   - 캘린더의 **12월 10일 칸**이 `"2025-12-09"` 문자열로 필터링됨
   - 실제 **12월 9일**에 저장된 데이터가 12월 10일 칸에 표시됨!

### 시간대 비교표

| 캘린더 날짜 (KST) | toISOString() 변환 후 (UTC) | 필터링되는 데이터 |
|------------------|----------------------------|-----------------|
| 12월 9일 00:00   | 2025-12-08T15:00:00Z       | 12월 8일 데이터 |
| 12월 10일 00:00  | 2025-12-09T15:00:00Z       | 12월 9일 데이터 |
| 12월 11일 00:00  | 2025-12-10T15:00:00Z       | 12월 10일 데이터 |

즉, 모든 날짜가 **1일씩 밀려서** 표시되는 문제가 발생합니다.

## 영향 범위

| 파일 | 위치 | 설명 |
|------|------|------|
| [MonthlyCalendar.tsx](src/components/MonthlyCalendar.tsx#L21) | `getDailyStatus()` | History 페이지 캘린더 |
| [UptimeGrid.tsx](src/components/UptimeGrid.tsx#L20) | `getDailyStatus()` | Dashboard 90일 그리드 |

## 해결 방안

### 수정 전 (현재 코드)
```typescript
const dateStr = date.toISOString().split('T')[0];
const dayLogs = data.filter((log) => log.timestamp.startsWith(dateStr));
```

### 수정 후 (로컬 타임존 사용)
```typescript
// 로컬 타임존 기준 날짜 문자열 생성 함수
const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDailyStatus = (date: Date): StatusType | 'NONE' => {
  const dateStr = toLocalDateString(date);  // 로컬 타임존 기준

  const dayLogs = data.filter((log) => {
    const logDate = new Date(log.timestamp);
    const logDateStr = toLocalDateString(logDate);  // 로컬 타임존 기준
    return logDateStr === dateStr;
  });

  if (dayLogs.length === 0) return 'NONE';
  if (dayLogs.some((log) => log.status === 'ERROR')) return 'ERROR';
  if (dayLogs.some((log) => log.status === 'WARN')) return 'WARN';
  return 'OK';
};
```

## 데이터 흐름 정리

```
┌─────────────────────────────────────────────────────────────────┐
│ 현재 (문제 있음)                                                   │
├─────────────────────────────────────────────────────────────────┤
│ 캘린더 날짜 (KST)                                                 │
│     ↓                                                           │
│ toISOString() → UTC로 변환되어 날짜가 하루 전으로 바뀜               │
│     ↓                                                           │
│ DB 데이터 (UTC)와 매칭 → 날짜가 1일 밀림                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 수정 후                                                          │
├─────────────────────────────────────────────────────────────────┤
│ 캘린더 날짜 (KST)                                                 │
│     ↓                                                           │
│ toLocalDateString() → KST 기준 날짜 문자열 유지                    │
│     ↓                                                           │
│ DB timestamp를 KST로 변환 후 비교 → 정확한 날짜 매칭               │
└─────────────────────────────────────────────────────────────────┘
```

## 참고: 관련 코드 위치

- DB 스키마: [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) - `TIMESTAMPTZ DEFAULT now()` (UTC 저장)
- 데이터 조회: [src/hooks/useServices.ts:57-81](src/hooks/useServices.ts#L57-L81)
- Python 저장: [scripts/health_check.py:91-101](scripts/health_check.py#L91-L101) - timestamp 필드 생략으로 DB default(UTC) 사용
