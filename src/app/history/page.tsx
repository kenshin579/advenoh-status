'use client';

import { useState } from 'react';
import { useUptimeData } from '@/hooks/useServices';
import MonthlyCalendar from '@/components/MonthlyCalendar';
import DayDetailPanel from '@/components/DayDetailPanel';

export default function HistoryPage() {
  const { summaryByDate, loading } = useUptimeData(365); // 1 year of data
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
          summaryByDate={summaryByDate}
          months={6}
          selectedDate={selectedDate}
          onDateClick={handleDateClick}
        />
        <DayDetailPanel selectedDate={selectedDate} summaryByDate={summaryByDate} />
      </div>
    </main>
  );
}
