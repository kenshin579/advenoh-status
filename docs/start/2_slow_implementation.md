# 대시보드 로딩 속도 개선 구현

## 개요

대시보드 페이지 로딩 속도 개선을 위해 다음 2가지를 구현한다:
1. N+1 쿼리 제거 - 단일 JOIN 쿼리로 변경
2. 날짜 인덱스 사전 처리 - O(n*m) → O(1) 조회

## 수정 대상 파일

| 파일 | 수정 내용 |
|------|-----------|
| `src/hooks/useServices.ts` | N+1 쿼리 제거, 날짜별 Map 반환 |
| `src/components/UptimeGrid.tsx` | Map 기반 조회로 변경 |
| `src/components/MonthlyCalendar.tsx` | Map 기반 조회로 변경 |
| `src/components/DayDetailPanel.tsx` | Map 기반 조회로 변경 |

---

## 1. N+1 쿼리 제거

### 현재 코드 (useServices.ts)

```typescript
// 1차 쿼리: 모든 서비스 조회
const { data: servicesData } = await supabase
  .from('services')
  .select('*');

// N개 추가 쿼리: 각 서비스별 상태 조회 (N+1 문제)
const servicesWithStatus = await Promise.all(
  servicesData.map(async (service) => {
    const { data: logs } = await supabase
      .from('service_status_logs')
      .select('status, timestamp')
      .eq('service_id', service.id)
      .order('timestamp', { ascending: false })
      .limit(1);
    // ...
  })
);
```

### 개선 코드

```typescript
// 단일 JOIN 쿼리로 서비스 + 최신 상태 조회
const { data: servicesData } = await supabase
  .from('services')
  .select(`
    *,
    service_status_logs(status, timestamp)
  `)
  .order('service_status_logs(timestamp)', { ascending: false })
  .limit(1, { foreignTable: 'service_status_logs' });

// 데이터 변환
const servicesWithStatus = servicesData?.map((service) => {
  const latestLog = service.service_status_logs?.[0];
  return {
    ...service,
    status: latestLog?.status ?? 'UNKNOWN',
    lastChecked: latestLog?.timestamp ?? null,
  };
}) ?? [];
```

---

## 2. 날짜 인덱스 사전 처리

### 현재 코드

```typescript
// UptimeGrid.tsx, MonthlyCalendar.tsx
const getDailyStatus = (date: Date): StatusType | 'NONE' => {
  const dateStr = toLocalDateString(date);
  const dayLogs = data.filter((log) => {  // O(n) 매번 필터링
    const logDate = new Date(log.timestamp);
    return toLocalDateString(logDate) === dateStr;
  });
  // ...
};
```

### 개선 코드

#### useServices.ts - Map 반환 추가

```typescript
export function useUptimeData(days: number) {
  const [data, setData] = useState<ServiceStatusLogWithService[]>([]);
  const [logsByDate, setLogsByDate] = useState<Map<string, ServiceStatusLogWithService[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUptimeData() {
      // ... 기존 fetch 로직 ...

      // 날짜별 Map 구조로 사전 처리
      const dateMap = new Map<string, ServiceStatusLogWithService[]>();
      logs?.forEach((log) => {
        const dateKey = toLocalDateString(new Date(log.timestamp));
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push(log);
      });

      setData(logs ?? []);
      setLogsByDate(dateMap);
      setLoading(false);
    }
    fetchUptimeData();
  }, [days]);

  return { data, logsByDate, loading };
}
```

#### UptimeGrid.tsx - Map 기반 조회

```typescript
interface UptimeGridProps {
  data: ServiceStatusLogWithService[];
  logsByDate: Map<string, ServiceStatusLogWithService[]>;
  days: number;
}

export default function UptimeGrid({ data, logsByDate, days }: UptimeGridProps) {
  const getDailyStatus = (date: Date): StatusType | 'NONE' => {
    const dateStr = toLocalDateString(date);
    const dayLogs = logsByDate.get(dateStr) ?? [];  // O(1) 조회
    // ... 기존 로직 ...
  };
  // ...
}
```

#### MonthlyCalendar.tsx - Map 기반 조회

```typescript
interface MonthlyCalendarProps {
  data: ServiceStatusLogWithService[];
  logsByDate: Map<string, ServiceStatusLogWithService[]>;
  months: number;
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
}

export default function MonthlyCalendar({ data, logsByDate, months, selectedDate, onDateClick }: MonthlyCalendarProps) {
  const getDailyStatus = (date: Date): StatusType | 'NONE' => {
    const dateStr = toLocalDateString(date);
    const dayLogs = logsByDate.get(dateStr) ?? [];  // O(1) 조회
    // ... 기존 로직 ...
  };
  // ...
}
```

---

## 3. 페이지 컴포넌트 수정

### page.tsx

```typescript
export default function Home() {
  const { services, loading: servicesLoading, error } = useServices();
  const { data: uptimeData, logsByDate, loading: uptimeLoading } = useUptimeData(90);

  // ...

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <Dashboard services={services} />
        <UptimeGrid data={uptimeData} logsByDate={logsByDate} days={90} />
      </div>
    </main>
  );
}
```

### history/page.tsx

```typescript
export default function HistoryPage() {
  const { data, logsByDate, loading } = useUptimeData(365);

  // ...

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Uptime History</h1>
        <MonthlyCalendar
          data={data}
          logsByDate={logsByDate}
          months={6}
          selectedDate={selectedDate}
          onDateClick={handleDateClick}
        />
        <DayDetailPanel selectedDate={selectedDate} logs={data} logsByDate={logsByDate} />
      </div>
    </main>
  );
}
```
