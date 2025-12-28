'use client';

import { parseTimestamp, toLocalDateString } from '@/lib/dateUtils';
import type { ServiceStatusLog, StatusType } from '@/types';

interface UptimeGridProps {
  data: ServiceStatusLog[];
  days?: number;
}

const statusColors: Record<StatusType | 'NONE', string> = {
  OK: 'bg-green-500',
  WARN: 'bg-yellow-500',
  ERROR: 'bg-red-500',
  NONE: 'bg-gray-200',
};

export default function UptimeGrid({ data, days = 90 }: UptimeGridProps) {
  // Calculate daily status (worst status of the day)
  const getDailyStatus = (date: Date): StatusType | 'NONE' => {
    const dateStr = toLocalDateString(date);
    const dayLogs = data.filter((log) => {
      const logDate = parseTimestamp(log.timestamp);
      return toLocalDateString(logDate) === dateStr;
    });

    if (dayLogs.length === 0) return 'NONE';
    if (dayLogs.some((log) => log.status === 'ERROR')) return 'ERROR';
    if (dayLogs.some((log) => log.status === 'WARN')) return 'WARN';
    return 'OK';
  };

  // Generate last N days
  const dates = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return date;
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">
        {days} Day Uptime
      </h3>
      <div className="flex gap-0.5 flex-wrap">
        {dates.map((date, i) => {
          const status = getDailyStatus(date);
          return (
            <div
              key={i}
              className={`w-2.5 h-8 rounded-sm ${statusColors[status]} cursor-pointer hover:opacity-80 transition-opacity`}
              title={`${formatDate(date)}: ${status === 'NONE' ? 'No data' : status}`}
            />
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded-sm" /> OK
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-yellow-500 rounded-sm" /> WARN
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-sm" /> ERROR
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-gray-200 rounded-sm" /> No data
        </span>
      </div>
    </div>
  );
}
