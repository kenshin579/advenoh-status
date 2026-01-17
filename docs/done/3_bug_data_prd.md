# 프론트엔드 과거 데이터 누락 버그 수정 PRD

## 1. 배경

### 문제 현상
- Supabase DB에는 2025-12-14부터 3,479개의 로그가 존재
- 프론트엔드(Dashboard, History 페이지)에서는 최근 약 10일간의 데이터만 표시
- 약 25일간의 과거 데이터가 누락되어 보임

### 근본 원인
- **Supabase API의 기본 row limit이 1000개로 제한**되어 있음
- 프론트엔드에서 `.limit(10000)` 설정했으나, Supabase 서버 설정이 우선 적용됨
- 쿼리가 `order('timestamp', { ascending: false })` (최신순)이므로 최신 1000개만 반환
- 결과적으로 과거 데이터가 잘림

### DB 조사 결과

| 항목 | 값 |
|-----|-----|
| 전체 로그 수 | 3,479개 |
| 서비스 수 | 5개 |
| Orphan 로그 | 0개 (데이터 정합성 문제 없음) |
| limit(10000) 요청 시 반환 | 1,000개 (Supabase 기본 limit) |

**날짜별 로그 분포 (샘플):**
```
2025-12-14: 18 logs
2025-12-15: 50 logs
2025-12-16: 72 logs
2025-12-17: 96 logs
...
2025-12-25: 96 logs (여기서 1000개 limit에 도달)
```

### 영향 범위
- Dashboard 페이지: 90일 업타임 그리드에서 과거 데이터 누락
- History 페이지: 월별 캘린더에서 과거 데이터 누락

## 2. 요구사항

### 2.1 Supabase 설정 변경 (권장)
- Supabase Dashboard에서 API Max Rows 설정을 10,000 이상으로 변경
- 설정 경로: Settings > API > Max Rows

### 2.2 또는 프론트엔드 페이지네이션 구현
- 1000개씩 여러 번 쿼리하여 데이터 합치기
- range() 함수를 사용한 offset 기반 페이지네이션

## 3. 구현 방안

### 3.1 방안 A: Supabase 설정 변경 (권장)

1. Supabase Dashboard 접속
2. Settings > API 메뉴 이동
3. "Max Rows" 값을 `1000` → `10000`으로 변경
4. 저장

**장점:**
- 코드 변경 없음
- 즉시 적용 가능

**단점:**
- 대용량 쿼리 시 성능 영향 가능

### 3.2 방안 B: 프론트엔드 페이지네이션

```typescript
// useServices.ts 수정
async function fetchAllLogs(startDate: string, pageSize = 1000) {
  let allLogs: ServiceStatusLogWithService[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from('service_status_logs')
      .select('*, services:service_id(name, url)')
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: false })
      .range(from, from + pageSize - 1);

    if (data && data.length > 0) {
      allLogs = [...allLogs, ...data];
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allLogs;
}
```

**장점:**
- Supabase 설정 변경 불필요
- 대용량 데이터도 안전하게 처리

**단점:**
- 코드 복잡도 증가
- 여러 번 API 호출로 초기 로딩 시간 증가

## 4. 테스트 시나리오

| # | 시나리오 | 예상 결과 |
|---|---------|----------|
| 1 | Dashboard 90일 그리드 확인 | 2025-12-14 이후 모든 데이터 표시 |
| 2 | History 월별 캘린더 확인 | 2025-12-14 이후 모든 날짜에 상태 표시 |
| 3 | 데이터 수 확인 | 3,479개 전체 로그 조회 가능 |

## 5. 결정 사항

- [ ] 방안 A (Supabase 설정 변경) 선택
- [ ] 방안 B (페이지네이션 구현) 선택
