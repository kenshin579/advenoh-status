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

  const lastCheckedIso = service.lastChecked
    ? new Date(service.lastChecked).toISOString()
    : null;

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            {service.url}
          </a>
        </div>
        <StatusBadge status={service.currentStatus} />
      </div>
      <div className="mt-3 text-xs text-gray-400">
        Last checked:{' '}
        {lastCheckedIso ? (
          <time dateTime={lastCheckedIso}>{formatDate(service.lastChecked)}</time>
        ) : (
          'Never'
        )}
      </div>
    </article>
  );
}
