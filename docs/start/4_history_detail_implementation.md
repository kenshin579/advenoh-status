# History 페이지 상세 정보 표시 - 구현 문서

## 수정 파일

### 1. `src/types/index.ts`

서비스 정보가 포함된 상태 로그 타입 추가:

```typescript
export interface ServiceStatusLogWithService extends ServiceStatusLog {
  services: {
    name: string;
    url: string;
  };
}
```

### 2. `src/hooks/useServices.ts`

`useUptimeData` 훅 수정 - 서비스 정보를 함께 조회:

```typescript
export function useUptimeData(days: number = 90) {
  const [data, setData] = useState<ServiceStatusLogWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchUptimeData() {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: logs } = await supabase
        .from('service_status_logs')
        .select(`
          *,
          services:service_id (name, url)
        `)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      setData((logs as ServiceStatusLogWithService[]) || []);
      setLoading(false);
    }

    fetchUptimeData();
  }, [days, supabase]);

  return { data, loading };
}
```

### 3. `src/components/MonthlyCalendar.tsx`

Props 확장 및 클릭 핸들러 추가:

```typescript
interface MonthlyCalendarProps {
  data: ServiceStatusLogWithService[];
  months?: number;
  selectedDate?: Date | null;
  onDateClick?: (date: Date) => void;
}
```

날짜 셀에 클릭 이벤트 및 선택 스타일 적용:

```tsx
<div
  key={i}
  onClick={() => onDateClick?.(date)}
  className={`
    p-1 text-center text-xs rounded cursor-pointer
    ${statusColors[status]}
    ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
    ${isSelected ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}
    hover:opacity-80 transition-opacity
  `}
  title={`${date.toLocaleDateString('ko-KR')}: ${status === 'NONE' ? 'No data' : status}`}
>
  {i + 1}
</div>
```

선택 여부 판단:

```typescript
const isSelected = selectedDate &&
  date.toDateString() === selectedDate.toDateString();
```

### 4. `src/components/DayDetailPanel.tsx` (신규)

```typescript
'use client';

import { toLocalDateString } from '@/lib/dateUtils';
import type { ServiceStatusLogWithService, StatusType } from '@/types';

interface DayDetailPanelProps {
  selectedDate: Date | null;
  logs: ServiceStatusLogWithService[];
}

const statusColors: Record<StatusType, string> = {
  OK: 'bg-green-500',
  WARN: 'bg-yellow-500',
  ERROR: 'bg-red-500',
};

const statusTextColors: Record<StatusType, string> = {
  OK: 'text-green-700',
  WARN: 'text-yellow-700',
  ERROR: 'text-red-700',
};

export default function DayDetailPanel({ selectedDate, logs }: DayDetailPanelProps) {
  if (!selectedDate) {
    return (
      <div className="mt-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
        달력에서 날짜를 클릭하면 상세 정보를 확인할 수 있습니다.
      </div>
    );
  }

  const dateStr = toLocalDateString(selectedDate);
  const dayLogs = logs.filter((log) => {
    const logDate = new Date(log.timestamp);
    return toLocalDateString(logDate) === dateStr;
  });

  // 전체 상태 계산
  const getOverallStatus = (): StatusType | null => {
    if (dayLogs.length === 0) return null;
    if (dayLogs.some((log) => log.status === 'ERROR')) return 'ERROR';
    if (dayLogs.some((log) => log.status === 'WARN')) return 'WARN';
    return 'OK';
  };

  const overallStatus = getOverallStatus();
  const formattedDate = selectedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">{formattedDate}</h3>
        {overallStatus && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-gray-600">전체 상태:</span>
            <span className={`text-sm font-medium ${statusTextColors[overallStatus]}`}>
              {overallStatus}
            </span>
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="p-4">
        {dayLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">이 날짜에 기록된 데이터가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {dayLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={`w-2 h-2 rounded-full ${statusColors[log.status]}`} />
                  <span className="font-medium text-gray-900">
                    {log.services?.name || 'Unknown Service'}
                  </span>
                  <span className={`text-sm font-medium ${statusTextColors[log.status]}`}>
                    {log.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 ml-5 sm:ml-0">
                  <span>{log.response_time > 0 ? `${log.response_time}ms` : '-'}</span>
                  {log.http_status && <span>HTTP {log.http_status}</span>}
                  <span>
                    {new Date(log.timestamp).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {log.message && (
                  <p className="text-sm text-gray-500 mt-1 ml-5">{log.message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5. `src/app/history/page.tsx`

상태 관리 및 컴포넌트 통합:

```typescript
'use client';

import { useState } from 'react';
import { useUptimeData } from '@/hooks/useServices';
import MonthlyCalendar from '@/components/MonthlyCalendar';
import DayDetailPanel from '@/components/DayDetailPanel';

export default function HistoryPage() {
  const { data, loading } = useUptimeData(365);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleDateClick = (date: Date) => {
    // 같은 날짜 클릭 시 선택 해제
    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Uptime History</h1>
        <MonthlyCalendar
          data={data}
          months={6}
          selectedDate={selectedDate}
          onDateClick={handleDateClick}
        />
        <DayDetailPanel selectedDate={selectedDate} logs={data} />
      </div>
    </main>
  );
}
```

## 주요 구현 포인트

1. **상태 관리**: `useState`로 선택된 날짜 관리
2. **토글 동작**: 같은 날짜 클릭 시 선택 해제
3. **데이터 필터링**: 클라이언트에서 날짜별 로그 필터링 (추가 API 호출 없음)
4. **반응형 디자인**: Tailwind CSS의 반응형 클래스 활용 (`sm:`, `md:`)
5. **접근성**: 키보드 포커스 스타일 유지
