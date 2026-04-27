'use client';

import { useServices, useUptimeData } from '@/hooks/useServices';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { services, loading: servicesLoading, error } = useServices();
  const { summaryByDate, loading: uptimeLoading } = useUptimeData(90);

  if (servicesLoading || uptimeLoading) {
    return (
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mono" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.2em', fontSize: 12 }}>
          // LOADING TELEMETRY
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--color-error)' }}>Error: {error}</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh' }}>
      <div className="mx-auto" style={{ maxWidth: 1280, padding: '24px 32px 0' }}>
        <Dashboard services={services} summaryByDate={summaryByDate} />
      </div>
    </main>
  );
}
