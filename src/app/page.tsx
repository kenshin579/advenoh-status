'use client';

import { useServices, useUptimeData } from '@/hooks/useServices';
import Dashboard from '@/components/Dashboard';
import UptimeGrid from '@/components/UptimeGrid';

export default function Home() {
  const { services, loading: servicesLoading, error } = useServices();
  const { data: uptimeData, logsByDate, loading: uptimeLoading } = useUptimeData(90);

  if (servicesLoading || uptimeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <Dashboard services={services} />
        <UptimeGrid data={uptimeData} logsByDate={logsByDate} days={90} />
      </div>
    </main>
  );
}
