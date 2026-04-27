'use client';

import GlassPanel from './ui/GlassPanel';
import StatusPill from './ui/StatusPill';
import { toLocalDateString } from '@/lib/dateUtils';
import type { StatusType } from '@/types';
import type { SummaryByDate } from '@/hooks/useServices';

interface DayDetailPanelProps {
  selectedDate: Date | null;
  summaryByDate: SummaryByDate;
}

const STATUS_COLOR: Record<StatusType, string> = {
  OK: 'var(--color-ok)',
  WARN: 'var(--color-warn)',
  ERROR: 'var(--color-error)',
};

export default function DayDetailPanel({ selectedDate, summaryByDate }: DayDetailPanelProps) {
  if (!selectedDate) {
    return (
      <GlassPanel
        style={{
          marginTop: 24,
          padding: 24,
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}
      >
        달력에서 날짜를 클릭하면 상세 정보를 확인할 수 있습니다.
      </GlassPanel>
    );
  }

  const dateStr = toLocalDateString(selectedDate);
  const daySummary = summaryByDate.get(dateStr) ?? [];

  const overallStatus = ((): StatusType | null => {
    if (daySummary.length === 0) return null;
    if (daySummary.some((s) => s.status === 'ERROR')) return 'ERROR';
    if (daySummary.some((s) => s.status === 'WARN')) return 'WARN';
    return 'OK';
  })();

  const formattedDate = selectedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const totalStats = daySummary.reduce(
    (acc, s) => ({
      ok: acc.ok + s.ok_count,
      warn: acc.warn + s.warn_count,
      error: acc.error + s.error_count,
    }),
    { ok: 0, warn: 0, error: 0 }
  );

  return (
    <GlassPanel style={{ marginTop: 24, overflow: 'hidden' }}>
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--color-glass-border)',
          background: 'rgba(0,0,0,0.18)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{formattedDate}</h3>
        {overallStatus && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>전체 상태:</span>
            <StatusPill status={overallStatus} />
          </div>
        )}
        {daySummary.length > 0 && (
          <div
            className="mono"
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 18,
              fontSize: 11,
              letterSpacing: '0.1em',
            }}
          >
            <span style={{ color: 'var(--color-ok)' }}>OK · {totalStats.ok}</span>
            <span style={{ color: 'var(--color-warn)' }}>WARN · {totalStats.warn}</span>
            <span style={{ color: 'var(--color-error)' }}>ERROR · {totalStats.error}</span>
          </div>
        )}
      </div>

      <div style={{ padding: 18 }}>
        {daySummary.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '16px 0' }}>
            이 날짜에 기록된 데이터가 없습니다.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {daySummary.map((summary) => (
              <div
                key={summary.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'rgba(0,0,0,0.18)',
                  borderRadius: 8,
                  border: '1px solid var(--color-glass-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: STATUS_COLOR[summary.status],
                      boxShadow: `0 0 8px ${STATUS_COLOR[summary.status]}`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {summary.services?.name || 'Unknown Service'}
                  </span>
                </div>
                <div
                  className="mono"
                  style={{
                    display: 'flex',
                    gap: 14,
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    letterSpacing: '0.06em',
                  }}
                >
                  <span style={{ color: 'var(--color-ok)' }}>OK · {summary.ok_count}</span>
                  <span style={{ color: 'var(--color-warn)' }}>W · {summary.warn_count}</span>
                  <span style={{ color: 'var(--color-error)' }}>E · {summary.error_count}</span>
                  {summary.avg_response_time != null && (
                    <span style={{ color: 'var(--color-cyan)' }}>
                      AVG · {summary.avg_response_time}ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
