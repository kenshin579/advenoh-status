import GlassPanel from './GlassPanel';
import type { Incident } from '@/types';

interface IncidentTimelineProps {
  incidents: Incident[];
  days?: number;
}

const STATUS_COLOR: Record<'WARN' | 'ERROR', string> = {
  WARN: 'var(--color-warn)',
  ERROR: 'var(--color-error)',
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ');
}

function formatTimeOnly(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
}

export default function IncidentTimeline({ incidents, days = 14 }: IncidentTimelineProps) {
  return (
    <GlassPanel style={{ padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
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
          // INCIDENTS · {days} DAY
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Recent timeline</div>
      </div>

      {incidents.length === 0 ? (
        <div
          className="mono"
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.1em',
            fontSize: 12,
          }}
        >
          No incidents in last {days} days · all clear
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 7,
              top: 6,
              bottom: 6,
              width: 1,
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 40%, transparent), color-mix(in srgb, var(--color-accent-2) 20%, transparent), transparent)',
            }}
          />
          {incidents.map((inc) => {
            const c = STATUS_COLOR[inc.status];
            return (
              <div key={inc.id} style={{ position: 'relative', paddingBottom: 22 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: -24,
                    top: 4,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: c,
                    boxShadow: `0 0 0 3px var(--color-bg-1), 0 0 14px ${c}, 0 0 24px color-mix(in srgb, ${c} 40%, transparent)`,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{inc.title}</span>
                  <span
                    className="mono"
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 9,
                      letterSpacing: '0.16em',
                      fontWeight: 700,
                      background: `color-mix(in srgb, ${c} 13%, transparent)`,
                      color: c,
                      border: `1px solid color-mix(in srgb, ${c} 33%, transparent)`,
                    }}
                  >
                    {inc.status} · {inc.service}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-dim)',
                    }}
                  >
                    {inc.resolved ? `resolved · ${inc.duration_min}m` : 'ongoing'}
                  </span>
                </div>
                {inc.body && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.6,
                      maxWidth: 720,
                    }}
                  >
                    {inc.body}
                  </div>
                )}
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--color-text-dim)',
                    marginTop: 4,
                    letterSpacing: '0.04em',
                  }}
                >
                  {formatTimestamp(inc.started)}
                  {inc.resolved && ` → ${formatTimeOnly(inc.resolved)}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}
