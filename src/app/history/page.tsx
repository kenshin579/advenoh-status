'use client';

import { useUptimeData } from '@/hooks/useServices';
import MonthlyCalendar from '@/components/MonthlyCalendar';

export default function HistoryPage() {
  const { data, loading } = useUptimeData(365); // 1 year of data

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Uptime History</h1>
        <MonthlyCalendar data={data} months={6} />
      </div>
    </main>
  );
}
