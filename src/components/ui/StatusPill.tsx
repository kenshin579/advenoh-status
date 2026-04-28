import type { StatusType } from '@/types';

interface StatusPillProps {
  status: StatusType;
  glitch?: boolean;
}

const STATUS_LABEL: Record<StatusType, string> = {
  OK: 'OPERATIONAL',
  WARN: 'DEGRADED',
  ERROR: 'INCIDENT',
};

const STATUS_COLOR_VAR: Record<StatusType, string> = {
  OK: 'var(--color-ok)',
  WARN: 'var(--color-warn)',
  ERROR: 'var(--color-error)',
};

export default function StatusPill({ status, glitch = false }: StatusPillProps) {
  const color = STATUS_COLOR_VAR[status];
  const label = STATUS_LABEL[status];
  const showGlitch = glitch && status !== 'OK';

  return (
    <span
      className="mono"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 11px',
        background: `color-mix(in srgb, ${color} 11%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 33%, transparent)`,
        borderRadius: 999,
        fontSize: 10,
        letterSpacing: '0.2em',
        fontWeight: 700,
        color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}, 0 0 16px color-mix(in srgb, ${color} 53%, transparent)`,
        }}
      />
      {label}
      {showGlitch && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            padding: '5px 11px',
            color: 'var(--color-cyan)',
            mixBlendMode: 'screen',
            animation: 'gGlitch 2.4s steps(1) infinite',
            pointerEvents: 'none',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ width: 6, height: 6 }} />
          {label}
        </span>
      )}
    </span>
  );
}
