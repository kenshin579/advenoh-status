# 대시보드 페이지 로딩 속도 저하 원인 분석

## 문제 현상

- 대시보드(`/`) 첫 로딩 또는 새로고침 시 로딩이 느림
- "Loading..." 상태가 오래 지속됨
- 추정 로딩 시간: 1,200ms ~ 2,500ms (최적화 시 300~500ms 가능)

> **참고:** History 페이지(`/history`)는 별도 페이지 진입 시 데이터를 로딩하므로, 대시보드 로딩 속도와는 무관함

## 데이터 흐름 분석

```
User visits /
    ↓
Next.js page.tsx 로드 ('use client' - hydration 지연)
    ↓
React hydrates on client (JS 로딩 대기)
    ↓
useServices() hook → useEffect 실행
useUptimeData() hook → useEffect 실행
    ↓
useServices() 쿼리:
  ├─ Query 1: 모든 서비스 조회 (await)
  └─ Query 2-N: 각 서비스별 상태 조회 (Promise.all)
       ↑ 각각 별도 네트워크 요청
    ↓
useUptimeData() 쿼리:
  └─ 90일치 로그 조회 (서비스 JOIN)
    ↓
두 hook 모두 완료 대기 (가장 느린 것 기준)
    ↓
컴포넌트 렌더링 시 데이터 필터링 (O(n*m) 연산)
    ↓
페이지 표시
```

## 핵심 성능 병목 지점

### 1. N+1 쿼리 문제 (심각)

**위치:** [useServices.ts:14-41](../../src/hooks/useServices.ts#L14-L41)

**문제:** 전형적인 N+1 쿼리 패턴 구현

```typescript
// 1차 쿼리: 모든 서비스 조회
const { data: servicesData } = await supabase
  .from('services')
  .select('*');

// N개 추가 쿼리: 각 서비스별 상태 조회
const servicesWithStatus = await Promise.all(
  servicesData.map(async (service) => {
    const { data: logs } = await supabase  // ← N개의 추가 쿼리!
      .from('service_status_logs')
      .select('status, timestamp')
      .eq('service_id', service.id)
      .order('timestamp', { ascending: false })
      .limit(1);
    // ...
  })
);
```

**영향:**
- 서비스 5개 기준 → 6개 DB 쿼리 (1 + 5) 발생 (1개로 충분)
- 각 쿼리마다 네트워크 지연 추가
- Supabase cold start 시 지연 누적

---

### 2. Client-Side Only 렌더링 (심각)

**위치:** [page.tsx:1-3](../../src/app/page.tsx#L1-L3)

**문제:** 메인 페이지가 `'use client'`로 선언되어 서버 사이드 렌더링 없음

```typescript
'use client';  // ← 전체 페이지가 클라이언트 사이드

export default function Home() {
  const { services, loading: servicesLoading } = useServices();  // ← 클라이언트 hook
  const { data: uptimeData, loading: uptimeLoading } = useUptimeData(90);  // ← 클라이언트 hook

  if (servicesLoading || uptimeLoading) {
    return <div className="text-gray-500">Loading...</div>;  // ← 로딩 워터폴
  }
  // ...
}
```

**영향:**
- React hydration 완료될 때까지 데이터 fetch 시작 안됨
- 사용자에게 빈 "Loading..." 상태 표시
- CLAUDE.md에 명시된 ISR 미적용 상태

---

### 3. 순차적 데이터 로딩 (중요)

**위치:** [page.tsx:8-11](../../src/app/page.tsx#L8-L11)

**문제:** 두 개의 독립적인 hook이 모두 완료될 때까지 대기

```typescript
const { services, loading: servicesLoading } = useServices();
const { data: uptimeData, loading: uptimeLoading } = useUptimeData(90);

if (servicesLoading || uptimeLoading) {  // ← 둘 다 완료 대기
  return <div>Loading...</div>;
}
```

**영향:**
- `useServices()` 800ms + `useUptimeData()` 500ms = ~1,300ms 대기
- 병렬 또는 서버 사이드 fetch 시 ~800ms로 단축 가능

---

### 4. 비효율적인 데이터 필터링 (중간)

**위치:**
- [UptimeGrid.tsx:20-31](../../src/components/UptimeGrid.tsx#L20-L31)
- [MonthlyCalendar.tsx:23-34](../../src/components/MonthlyCalendar.tsx#L23-L34)

**문제:** 렌더링마다 O(n*m) 필터링 수행

```typescript
const getDailyStatus = (date: Date): StatusType | 'NONE' => {
  const dateStr = toLocalDateString(date);
  const dayLogs = data.filter((log) => {  // ← 각 날짜마다 선형 검색
    const logDate = new Date(log.timestamp);
    return toLocalDateString(logDate) === dateStr;
  });
  // 90일 × 50개 로그 = 4,500번 비교/렌더링
};
```

**영향:**
- UptimeGrid (90일): 90회 필터 × 로그 수
- MonthlyCalendar (180일): 180회 필터 × 로그 수
- 메모이제이션이나 인덱스 기반 조회 없음

---

### 5. ISR/Revalidation 미설정 (중요)

**위치:** [next.config.ts](../../next.config.ts)

**문제:** CLAUDE.md에 ISR 언급되어 있으나 실제 미구현

```typescript
// next.config.ts - 현재 상태
const nextConfig: NextConfig = {
  async headers() {
    return [ /* security headers */ ];
  },
};
// revalidate 설정 없음!
```

**영향:**
- 대시보드 데이터 캐싱/재검증 없음
- 매 페이지 로드마다 fresh fetch 필요
- DB 부하 증가, edge caching 미활용

---

## 성능 문제 요약 (대시보드)

| 문제 | 심각도 | 현재 상태 | 권장 사항 | 적용 여부 |
|------|--------|-----------|-----------|-----------|
| N+1 쿼리 | 심각 | 서비스별 개별 쿼리 | 단일 JOIN 쿼리 | ✅ 적용 |
| 데이터 필터링 성능 | 중간 | 날짜별 선형 검색 | Map/Index 구조로 사전 처리 | ✅ 적용 |
| 클라이언트 사이드 렌더링 | 심각 | 모든 데이터 클라이언트 hook | 서버 사이드 fetch + ISR | ❌ 미적용 |
| 순차 로딩 | 중요 | 두 hook 모두 대기 | 병렬 또는 통합 fetch | ❌ 미적용 |
| 캐싱 전략 | 중요 | ISR 미적용 | 5-10분 revalidation 적용 | ❌ 미적용 |

---

## 적용할 최적화 방안

### 1. N+1 쿼리 제거 ✅

```typescript
// 현재: 개별 쿼리 루프
// 개선: 단일 JOIN 쿼리
const { data } = await supabase
  .from('services')
  .select(`
    *,
    service_status_logs(status, timestamp)
  `)
  .order('service_status_logs(timestamp)', { ascending: false });
```

### 2. 날짜 인덱스 사전 처리 ✅

```typescript
// fetch 시 Map 구조로 변환
const logsByDate = new Map<string, ServiceStatusLog[]>();
logs.forEach(log => {
  const dateKey = toLocalDateString(new Date(log.timestamp));
  if (!logsByDate.has(dateKey)) {
    logsByDate.set(dateKey, []);
  }
  logsByDate.get(dateKey)!.push(log);
});

// 조회 시 O(1)
const getDailyStatus = (date: Date) => {
  return logsByDate.get(toLocalDateString(date)) ?? [];
};
```

---

## 미적용 최적화 방안 (향후 검토)

### 서버 사이드 Fetching + ISR 적용

```typescript
// page.tsx를 async 서버 컴포넌트로 변환
export const revalidate = 300; // 5분

export default async function Home() {
  const services = await fetchServices();  // 서버에서 fetch
  const uptimeData = await fetchUptimeData(90);

  return <Dashboard services={services} uptimeData={uptimeData} />;
}
```

### Header SSR 복원

```typescript
// 현재
const Header = dynamic(() => import('./Header'), { ssr: false });

// 개선: ssr: false 제거
import Header from './Header';
```

---

## 예상 성능 개선 효과

| 지표 | 현재 | 적용 후 (N+1 + 인덱싱) |
|------|------|------------------------|
| DB 쿼리 수 | 6-10개 | 1-2개 |
| 데이터 필터링 | O(n*m) | O(1) |

> **참고:** 클라이언트 사이드 렌더링 유지로 인해 FCP/LCP 개선은 제한적. 추후 SSR + ISR 적용 시 추가 개선 가능.

---

## 결론

대시보드 페이지 로딩 속도 개선을 위해 다음 2가지를 적용:

1. ✅ **N+1 쿼리 제거** - 단일 JOIN 쿼리로 DB 요청 횟수 감소
2. ✅ **날짜 인덱스 사전 처리** - O(n*m) → O(1) 조회 성능 개선

미적용 항목 (향후 검토):
- ❌ 서버 사이드 렌더링 + ISR
- ❌ Header SSR 복원

---

## 별도 이슈: History 페이지 성능

> 대시보드 로딩과는 별개로, History 페이지(`/history`) 진입 시 발생하는 성능 문제

**위치:** [history/page.tsx:9](../../src/app/history/page.tsx#L9)

**문제:** 365일치 전체 데이터를 한 번에 로딩

```typescript
'use client';

export default function HistoryPage() {
  const { data, loading } = useUptimeData(365);  // ← 365일 전체 데이터
  // ...
}
```

**영향:**
- 페이지네이션 또는 지연 로딩 없음
- 대용량 페이로드 전송 가능
- History 페이지 진입 시 로딩 지연

**권장 사항:**
- 월별 데이터 분할 로딩 (페이지네이션)
- 또는 무한 스크롤 방식 적용
