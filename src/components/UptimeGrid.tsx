'use client';

import GlassPanel from './ui/GlassPanel';
import { toLocalDateString, calcUptime30d } from '@/lib/dateUtils';
import type { ServiceWithStatus, StatusType } from '@/types';
import type { SummaryByDate } from '@/hooks/useServices';

interface UptimeHeatmapProps {
  services: ServiceWithStatus[];
  summaryByDate: SummaryByDate;
  days?: number;
}

const STATUS_COLOR: Record<Exclude<StatusType, never>, string> = {
  OK: 'var(--color-ok)',
  WARN: 'var(--color-warn)',
  ERROR: 'var(--color-error)',
};

const STATUS_RAW_COLOR: Record<StatusType, string> = {
  OK: '#5af0a8',
  WARN: '#ffb84d',
  ERROR: '#ff5b6e',
};

export default function UptimeHeatmap({
  services,
  summaryByDate,
  days = 90,
}: UptimeHeatmapProps) {
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1 - i));
    return d;
  });

  return (
    <GlassPanel style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              color: 'var(--color-cyan)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            // UPTIME · {days} DAY
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Service health timeline</div>
        </div>
        <div
          className="mono"
          style={{
            display: 'flex',
            gap: 14,
            fontSize: 10,
            alignItems: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          {(['OK', 'WARN', 'ERROR'] as const).map((s) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.1em' }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: STATUS_COLOR[s],
                  boxShadow: `0 0 6px color-mix(in srgb, ${STATUS_RAW_COLOR[s]} 67%, transparent)`,
                }}
              />
              {s}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {services.map((svc) => {
          const uptime = svc.uptime30d ?? calcUptime30d(summaryByDate, svc.id);
          return (
            <div
              key={svc.id}
              className="heatmap-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 70px',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {svc.name}
              </div>
              <div style={{ display: 'flex', gap: 2, height: 26 }}>
                {dates.map((d, di) => {
                  const summ = summaryByDate
                    .get(toLocalDateString(d))
                    ?.find((s) => s.service_id === svc.id);
                  const status = summ?.status;
                  if (!status) {
                    return (
                      <div
                        key={di}
                        style={{
                          flex: 1,
                          minWidth: 4,
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: 2,
                        }}
                      />
                    );
                  }
                  const c = STATUS_RAW_COLOR[status];
                  return (
                    <div
                      key={di}
                      title={`${d.toLocaleDateString('ko-KR')} · ${status} · ${summ?.avg_response_time ?? '—'}ms`}
                      style={{
                        flex: 1,
                        minWidth: 4,
                        borderRadius: 2,
                        background: c,
                        boxShadow: `0 0 4px color-mix(in srgb, ${c} 53%, transparent)`,
                      }}
                    />
                  );
                })}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 12,
                  textAlign: 'right',
                  color: 'var(--color-text)',
                  fontWeight: 600,
                }}
              >
                {uptime != null ? uptime : '—'}
                <span style={{ color: 'var(--color-text-dim)', fontWeight: 400 }}>
                  {uptime != null ? '%' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .heatmap-row {
            grid-template-columns: 100px 1fr 60px !important;
          }
        }
      `}</style>
    </GlassPanel>
  );
}
