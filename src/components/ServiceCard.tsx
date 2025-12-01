'use client';

import StatusBadge from './StatusBadge';
import type { ServiceWithStatus } from '@/types';

interface ServiceCardProps {
  service: ServiceWithStatus;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{service.url}</p>
        </div>
        <StatusBadge status={service.currentStatus} />
      </div>
      <div className="mt-3 text-xs text-gray-400">
        Last checked: {formatDate(service.lastChecked)}
      </div>
    </div>
  );
}
