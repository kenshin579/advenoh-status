'use client';

import { parseTimestamp, toLocalDateString } from '@/lib/dateUtils';
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
    const logDate = parseTimestamp(log.timestamp);
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
                    {parseTimestamp(log.timestamp).toLocaleTimeString('ko-KR', {
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
