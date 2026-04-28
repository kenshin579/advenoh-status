import GlassPanel from './GlassPanel';
import type { ServiceWithStatus, StatusType } from '@/types';

interface HeroPanelProps {
  services: ServiceWithStatus[];
  overall: StatusType;
}

const HEADLINE: Record<StatusType, string> = {
  OK: 'All systems online',
  WARN: 'Partial degradation',
  ERROR: 'Active incident',
};

export default function HeroPanel({ services, overall }: HeroPanelProps) {
  const okCount = services.filter((s) => s.currentStatus === 'OK').length;
  const warnCount = services.filter((s) => s.currentStatus === 'WARN').length;
  const errCount = services.filter((s) => s.currentStatus === 'ERROR').length;

  const validResponseTimes = services
    .map((s) => s.responseTime)
    .filter((v): v is number => v != null);
  const avgResponse =
    validResponseTimes.length > 0
      ? Math.round(validResponseTimes.reduce((a, b) => a + b, 0) / validResponseTimes.length)
      : 0;

  const headline = HEADLINE[overall];

  const lastRefreshed = new Date()
    .toLocaleTimeString('en-US', { hour12: false })
    .slice(0, 5);

  const kpis: { label: string; value: number; color: string }[] = [
    { label: 'ONLINE', value: okCount, color: 'var(--color-ok)' },
    { label: 'DEGRADED', value: warnCount, color: 'var(--color-warn)' },
    { label: 'DOWN', value: errCount, color: 'var(--color-error)' },
    { label: 'AVG · ms', value: avgResponse, color: 'var(--color-cyan)' },
  ];

  return (
    <GlassPanel hi style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 33%, transparent), transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(20px)',
        }}
      />

      <div className="hero-grid" style={{ position: 'relative' }}>
        <div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.24em',
              color: 'var(--color-cyan)',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            // SYSTEM TELEMETRY
          </div>
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 700,
              margin: '0 0 10px',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              background:
                'linear-gradient(180deg, var(--color-text) 30%, var(--color-text-muted) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {headline}
          </h1>
          <div
            style={{
              fontSize: 14,
              color: 'var(--color-text-muted)',
              lineHeight: 1.55,
              maxWidth: 420,
            }}
          >
            {services.length} services monitored across edge & origin. Telemetry pulse every 5min, last refreshed {lastRefreshed}.
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {kpis.map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--color-glass-border)',
                borderRadius: 10,
                padding: '14px 16px',
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  color: 'var(--color-text-dim)',
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: `0 0 18px color-mix(in srgb, ${color} 33%, transparent)`,
                }}
              >
                {value < 100 && label !== 'AVG · ms' ? String(value).padStart(2, '0') : value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hero-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 36px;
          align-items: center;
        }
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
      `}</style>
    </GlassPanel>
  );
}
