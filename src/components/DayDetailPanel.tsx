'use client';

import { toLocalDateString } from '@/lib/dateUtils';
import type { StatusType } from '@/types';
import type { SummaryByDate } from '@/hooks/useServices';

interface DayDetailPanelProps {
  selectedDate: Date | null;
  summaryByDate: SummaryByDate;
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

export default function DayDetailPanel({ selectedDate, summaryByDate }: DayDetailPanelProps) {
  if (!selectedDate) {
    return (
      <div className="mt-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
        달력에서 날짜를 클릭하면 상세 정보를 확인할 수 있습니다.
      </div>
    );
  }

  const dateStr = toLocalDateString(selectedDate);
  const daySummary = summaryByDate.get(dateStr) ?? [];

  // 전체 상태 계산
  const getOverallStatus = (): StatusType | null => {
    if (daySummary.length === 0) return null;
    if (daySummary.some((s) => s.status === 'ERROR')) return 'ERROR';
    if (daySummary.some((s) => s.status === 'WARN')) return 'WARN';
    return 'OK';
  };

  const overallStatus = getOverallStatus();
  const formattedDate = selectedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // 전체 통계 계산
  const totalStats = daySummary.reduce(
    (acc, s) => ({
      ok: acc.ok + s.ok_count,
      warn: acc.warn + s.warn_count,
      error: acc.error + s.error_count,
    }),
    { ok: 0, warn: 0, error: 0 }
  );

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
        {daySummary.length > 0 && (
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <span className="text-green-600">OK: {totalStats.ok}</span>
            <span className="text-yellow-600">WARN: {totalStats.warn}</span>
            <span className="text-red-600">ERROR: {totalStats.error}</span>
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="p-4">
        {daySummary.length === 0 ? (
          <p className="text-gray-500 text-center py-4">이 날짜에 기록된 데이터가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {daySummary.map((summary) => (
              <div
                key={summary.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={`w-2 h-2 rounded-full ${statusColors[summary.status]}`} />
                  <span className="font-medium text-gray-900">
                    {summary.services?.name || 'Unknown Service'}
                  </span>
                  <span className={`text-sm font-medium ${statusTextColors[summary.status]}`}>
                    {summary.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 ml-5 sm:ml-0">
                  <span>OK: {summary.ok_count}</span>
                  <span>WARN: {summary.warn_count}</span>
                  <span>ERROR: {summary.error_count}</span>
                  {summary.avg_response_time && (
                    <span>평균: {summary.avg_response_time}ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
