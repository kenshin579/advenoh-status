'use client';

import GlassPanel from '../ui/GlassPanel';
import type { Service, ServiceWithStatus, StatusType } from '@/types';

interface ServiceListProps {
  services: Service[];
  loading: boolean;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  serviceStatuses?: Record<string, StatusType>;
}

const STATUS_COLOR: Record<StatusType, string> = {
  OK: 'var(--color-ok)',
  WARN: 'var(--color-warn)',
  ERROR: 'var(--color-error)',
};

const buttonStyle = (variant: 'edit' | 'delete' = 'edit'): React.CSSProperties => ({
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${
    variant === 'delete'
      ? 'color-mix(in srgb, var(--color-error) 40%, transparent)'
      : 'var(--color-glass-border)'
  }`,
  color: variant === 'delete' ? 'var(--color-error)' : 'var(--color-text)',
  padding: '6px 14px',
  borderRadius: 7,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: 'inherit',
});

export default function ServiceList({
  services,
  loading,
  onEdit,
  onDelete,
  serviceStatuses = {},
}: ServiceListProps) {
  const formatDate = (dateString: string) =>
    new Date(dateString).toISOString().slice(0, 10);

  if (loading) {
    return (
      <div
        className="mono"
        style={{
          textAlign: 'center',
          padding: 48,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.2em',
          fontSize: 12,
        }}
      >
        // LOADING SERVICES
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <GlassPanel style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No services registered.
      </GlassPanel>
    );
  }

  return (
    <GlassPanel style={{ overflow: 'hidden' }}>
      <div
        className="mono"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 2fr 110px 130px 150px',
          gap: 20,
          padding: '14px 24px',
          borderBottom: '1px solid var(--color-glass-border)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        <span>Service</span>
        <span>Endpoint</span>
        <span>Threshold</span>
        <span>Created</span>
        <span style={{ textAlign: 'right' }}>Actions</span>
      </div>
      {services.map((service, i) => {
        const status: StatusType | undefined =
          serviceStatuses[service.id] ?? (service as ServiceWithStatus).currentStatus;
        const dotColor = status ? STATUS_COLOR[status] : 'var(--color-text-dim)';

        return (
          <div
            key={service.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 2fr 110px 130px 150px',
              gap: 20,
              padding: '16px 24px',
              borderTop: i === 0 ? 'none' : '1px solid var(--color-glass-border)',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: dotColor,
                  boxShadow: `0 0 10px ${dotColor}, 0 0 20px color-mix(in srgb, ${dotColor} 33%, transparent)`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {service.name}
              </span>
            </div>
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mono"
              style={{
                color: 'var(--color-cyan)',
                textDecoration: 'none',
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {service.url}
            </a>
            <span
              className="mono"
              style={{
                color: 'var(--color-text)',
                fontSize: 12,
              }}
            >
              {service.threshold_ms}ms
            </span>
            <span
              className="mono"
              style={{
                color: 'var(--color-text-dim)',
                fontSize: 11,
              }}
            >
              {formatDate(service.created_at)}
            </span>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => onEdit(service)} style={buttonStyle('edit')}>
                Edit
              </button>
              <button onClick={() => onDelete(service)} style={buttonStyle('delete')}>
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </GlassPanel>
  );
}
