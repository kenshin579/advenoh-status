'use client';

import type { ServiceWithStatus, StatusType } from '@/types';
import type { SummaryByDate } from '@/hooks/useServices';
import { calcUptime30d } from '@/lib/dateUtils';
import HeroPanel from './ui/HeroPanel';
import ServiceCard from './ServiceCard';
import UptimeHeatmap from './UptimeGrid';

interface DashboardProps {
  services: ServiceWithStatus[];
  summaryByDate: SummaryByDate;
}

function deriveOverall(services: ServiceWithStatus[]): StatusType {
  if (services.some((s) => s.currentStatus === 'ERROR')) return 'ERROR';
  if (services.some((s) => s.currentStatus === 'WARN')) return 'WARN';
  return 'OK';
}

export default function Dashboard({ services, summaryByDate }: DashboardProps) {
  const enriched = services.map((s) => ({
    ...s,
    uptime30d: s.uptime30d ?? calcUptime30d(summaryByDate, s.id),
  }));

  const overall = deriveOverall(enriched);

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <HeroPanel services={enriched} overall={overall} />
      </div>

      <section
        aria-label="Service status list"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: 22,
        }}
      >
        {enriched.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </section>

      {enriched.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 48 }}>
          No services configured
        </div>
      ) : (
        <div style={{ marginBottom: 22 }}>
          <UptimeHeatmap services={enriched} summaryByDate={summaryByDate} days={90} />
        </div>
      )}
    </div>
  );
}
