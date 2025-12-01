'use client';

import type { ServiceWithStatus, StatusType } from '@/types';
import ServiceCard from './ServiceCard';

interface DashboardProps {
  services: ServiceWithStatus[];
}

export default function Dashboard({ services }: DashboardProps) {
  // Determine overall system status
  const getOverallStatus = (): { status: StatusType; message: string } => {
    const hasError = services.some((s) => s.currentStatus === 'ERROR');
    const hasWarn = services.some((s) => s.currentStatus === 'WARN');

    if (hasError) {
      return { status: 'ERROR', message: 'Major Outage' };
    }
    if (hasWarn) {
      return { status: 'WARN', message: 'Partial Outage' };
    }
    return { status: 'OK', message: 'All Systems Operational' };
  };

  const overall = getOverallStatus();

  const statusColors: Record<StatusType, string> = {
    OK: 'bg-green-500',
    WARN: 'bg-yellow-500',
    ERROR: 'bg-red-500',
  };

  const statusTextColors: Record<StatusType, string> = {
    OK: 'text-green-600',
    WARN: 'text-yellow-600',
    ERROR: 'text-red-600',
  };

  return (
    <div>
      {/* Overall Status Banner */}
      <div className={`${statusColors[overall.status]} rounded-lg p-6 mb-8`}>
        <h2 className="text-2xl font-bold text-white">{overall.message}</h2>
        <p className="text-white/80 mt-1">
          {services.length} services monitored
        </p>
      </div>

      {/* Service Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No services configured
        </div>
      )}
    </div>
  );
}
