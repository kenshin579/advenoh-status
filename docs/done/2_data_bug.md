# Dashboard/History 페이지 데이터 미표시 버그 분석

## 문제 현상

- DB에 12/27, 12/28 데이터가 존재함 (확인됨: 12/28 28건, 12/27 96건)
- Dashboard의 90 Day Uptime 그리드에서 해당 날짜가 회색(No data)으로 표시
- History 캘린더에서도 해당 날짜가 회색(No data)으로 표시

## 원인 (확정)

### 1차 원인 (해결됨): PostgreSQL timestamp 형식

**SQL Editor에서 본 형식:**
```
2025-12-28 06:07:09.312465+00
```

**Supabase REST API가 반환하는 형식:**
```
2025-12-28T11:04:21.855241+00:00  (이미 ISO 8601 형식!)
```

→ REST API는 이미 올바른 형식을 반환하므로 실제 문제가 아니었음

### 2차 원인 (실제 원인): Supabase 기본 limit 1000

**문제:**
```typescript
// 기존 코드
const { data: logs } = await supabase
  .from('service_status_logs')
  .select(...)
  .gte('timestamp', startDate.toISOString())
  .order('timestamp', { ascending: true });  // 오름차순 정렬
```

- Supabase 기본 limit: **1000개**
- 오름차순 정렬로 **오래된 데이터부터** 1000개만 반환
- 최신 데이터(12/27, 28)가 limit에 걸려 **누락**

**디버깅 로그 확인:**
```
[DEBUG] Total logs: 1000, DateMap keys: [2025-12-22, 2025-12-23, 2025-12-24, 2025-12-25, 2025-12-26]
```
→ 12/27, 12/28 데이터가 없음!

## 해결 방안

### 1. limit 확장 + 내림차순 정렬

```typescript
// 수정된 코드
const { data: logs } = await supabase
  .from('service_status_logs')
  .select(...)
  .gte('timestamp', startDate.toISOString())
  .order('timestamp', { ascending: false })  // 내림차순으로 변경
  .limit(10000);  // 기본 1000 → 10000으로 확장
```

### 2. parseTimestamp 함수 (유지)

Supabase REST API가 올바른 형식을 반환하지만, SQL Editor 형식과의 일관성을 위해 유지:

```typescript
export const parseTimestamp = (timestamp: string): Date => {
  const isoString = timestamp
    .replace(' ', 'T')
    .replace(/([+-]\d{2})$/, '$1:00');
  return new Date(isoString);
};
```

## 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/hooks/useServices.ts` | `.limit(10000)` 추가, 내림차순 정렬 |
| `src/lib/dateUtils.ts` | `parseTimestamp` 함수 추가 |

## 교훈

1. **Supabase 기본 limit 주의**: 명시적으로 `.limit()` 지정 필요
2. **정렬 순서 확인**: 최신 데이터가 필요하면 내림차순 사용
3. **디버깅 로그 활용**: 실제 데이터 확인으로 원인 파악
