'use client';

import GlassPanel from './ui/GlassPanel';
import StatusPill from './ui/StatusPill';
import Sparkline from './ui/Sparkline';
import { useResponseTrace } from '@/hooks/useResponseTrace';
import type { ServiceWithStatus, StatusType } from '@/types';

interface ServiceCardProps {
  service: ServiceWithStatus;
  showSparkline?: boolean;
}

const STATUS_COLOR: Record<StatusType, string> = {
  OK: 'var(--color-ok)',
  WARN: 'var(--color-warn)',
  ERROR: 'var(--color-error)',
};

export default function ServiceCard({ service, showSparkline = true }: ServiceCardProps) {
  const { points } = useResponseTrace(showSparkline ? service.id : null, 30);
  const sc = service.currentStatus;
  const color = STATUS_COLOR[sc];
  const domain = service.url.replace(/^https?:\/\//, '');

  return (
    <GlassPanel
      style={{
        padding: 22,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {sc !== 'OK' && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            boxShadow: `0 0 12px ${color}`,
          }}
        />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em' }}>
            {service.name}
          </div>
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mono"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 11,
              color: 'var(--color-text-dim)',
              marginTop: 2,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
          >
            {domain}
          </a>
        </div>
        <StatusPill status={sc} />
      </div>

      {showSparkline && points.length > 0 && (
        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <Sparkline values={points.map((p) => p.avgMs)} color={color} height={36} />
        </div>
      )}

      <div
        className="mono"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          marginTop: 14,
          paddingTop: 14,
          borderTop: '1px solid var(--color-glass-border)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: '0.16em',
              color: 'var(--color-text-dim)',
              fontWeight: 600,
            }}
          >
            LATENCY
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
            {service.responseTime ?? '—'}
            <span style={{ color: 'var(--color-text-dim)', fontSize: 11, fontWeight: 400 }}>
              {service.responseTime != null ? 'ms' : ''}
            </span>
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: '0.16em',
              color: 'var(--color-text-dim)',
              fontWeight: 600,
            }}
          >
            UPTIME 30D
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
            {service.uptime30d != null ? service.uptime30d : '—'}
            <span style={{ color: 'var(--color-text-dim)', fontSize: 11, fontWeight: 400 }}>
              {service.uptime30d != null ? '%' : ''}
            </span>
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: '0.16em',
              color: 'var(--color-text-dim)',
              fontWeight: 600,
            }}
          >
            SLA
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
            {service.threshold_ms}
            <span style={{ color: 'var(--color-text-dim)', fontSize: 11, fontWeight: 400 }}>ms</span>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
