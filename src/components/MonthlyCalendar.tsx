'use client';

import { parseTimestamp, toLocalDateString } from '@/lib/dateUtils';
import type { ServiceStatusLogWithService, StatusType } from '@/types';

interface MonthlyCalendarProps {
  data: ServiceStatusLogWithService[];
  months?: number;
  selectedDate?: Date | null;
  onDateClick?: (date: Date) => void;
}

const statusColors: Record<StatusType | 'NONE', string> = {
  OK: 'bg-green-500 text-white',
  WARN: 'bg-yellow-500 text-white',
  ERROR: 'bg-red-500 text-white',
  NONE: 'bg-gray-100 text-gray-400',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthlyCalendar({ data, months = 6, selectedDate, onDateClick }: MonthlyCalendarProps) {
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

  // Generate last N months
  const monthDates = Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date;
  }).reverse();

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  };

  return (
    <div className="space-y-6">
      {/* Calendar Grid - 3 columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthDates.map((monthDate) => {
          const year = monthDate.getFullYear();
          const month = monthDate.getMonth();
          const daysInMonth = getDaysInMonth(year, month);
          const firstDay = getFirstDayOfMonth(year, month);

          return (
            <div key={`${year}-${month}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <h3 className="text-base font-semibold mb-2 text-gray-900">
                {formatMonth(monthDate)}
              </h3>
              <div className="grid grid-cols-7 gap-0.5">
                {/* Weekday headers */}
                {WEEKDAYS.map((day) => (
                  <div key={day} className="text-center text-[10px] text-gray-500 py-1 font-medium">
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before the first */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-1" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const date = new Date(year, month, i + 1);
                  const status = getDailyStatus(date);
                  const isToday =
                    date.toDateString() === new Date().toDateString();
                  const isSelected =
                    selectedDate && date.toDateString() === selectedDate.toDateString();

                  return (
                    <div
                      key={i}
                      onClick={() => onDateClick?.(date)}
                      className={`
                        p-1 text-center text-xs rounded cursor-pointer
                        ${statusColors[status]}
                        ${isToday && !isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                        ${isSelected ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}
                        hover:opacity-80 transition-opacity
                      `}
                      title={`${date.toLocaleDateString('ko-KR')}: ${status === 'NONE' ? 'No data' : status}`}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center text-sm text-gray-600">
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" /> OK
        </span>
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded" /> WARN
        </span>
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded" /> ERROR
        </span>
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" /> No data
        </span>
      </div>
    </div>
  );
}
