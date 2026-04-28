'use client';

import GlassPanel from './ui/GlassPanel';
import { toLocalDateString } from '@/lib/dateUtils';
import type { StatusType } from '@/types';
import type { SummaryByDate } from '@/hooks/useServices';

interface MonthlyCalendarProps {
  summaryByDate: SummaryByDate;
  months?: number;
  selectedDate?: Date | null;
  onDateClick?: (date: Date) => void;
}

const STATUS_RAW: Record<StatusType, string> = {
  OK: '#5af0a8',
  WARN: '#ffb84d',
  ERROR: '#ff5b6e',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getDailyStatus(
  summaryByDate: SummaryByDate,
  date: Date
): StatusType | 'NONE' {
  const dateStr = toLocalDateString(date);
  const day = summaryByDate.get(dateStr) ?? [];
  if (day.length === 0) return 'NONE';
  if (day.some((s) => s.status === 'ERROR')) return 'ERROR';
  if (day.some((s) => s.status === 'WARN')) return 'WARN';
  return 'OK';
}

function MonthCard({
  monthDate,
  summaryByDate,
  selectedDate,
  onDateClick,
}: {
  monthDate: Date;
  summaryByDate: SummaryByDate;
  selectedDate?: Date | null;
  onDateClick?: (date: Date) => void;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let ok = 0;
  let tracked = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    if (d.getTime() > today.getTime()) continue;
    const s = getDailyStatus(summaryByDate, d);
    if (s !== 'NONE') tracked += 1;
    if (s === 'OK') ok += 1;
  }
  const pct = tracked ? ((ok / tracked) * 100).toFixed(1) : '—';

  return (
    <GlassPanel style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.005em' }}>
          {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--color-cyan)',
            fontWeight: 600,
          }}
        >
          {pct}{tracked ? '%' : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className="mono"
            style={{
              fontSize: 9,
              color: 'var(--color-text-dim)',
              textAlign: 'center',
              padding: '4px 0',
              letterSpacing: '0.1em',
              fontWeight: 600,
            }}
          >
            {d}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = new Date(year, month, i + 1);
          const isFuture = d.getTime() > today.getTime();
          const status = isFuture ? 'NONE' : getDailyStatus(summaryByDate, d);
          const isToday = d.getTime() === today.getTime();
          const isSelected = !!(
            selectedDate && d.toDateString() === selectedDate.toDateString()
          );
          const c = status === 'NONE' ? 'rgba(255,255,255,0.05)' : STATUS_RAW[status];

          return (
            <button
              key={i}
              onClick={() => onDateClick?.(d)}
              type="button"
              title={`${d.toLocaleDateString('ko-KR')} · ${status}`}
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                background: isFuture ? 'rgba(255,255,255,0.03)' : c,
                boxShadow:
                  !isFuture && status !== 'NONE'
                    ? `0 0 8px color-mix(in srgb, ${c} 53%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)`
                    : 'none',
                border: isSelected
                  ? '1.5px solid var(--color-accent)'
                  : isToday
                    ? '1.5px solid var(--color-cyan)'
                    : '1px solid rgba(255,255,255,0.05)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 10,
                fontWeight: 600,
                color: isFuture
                  ? 'var(--color-text-dim)'
                  : status === 'NONE'
                    ? 'var(--color-text-dim)'
                    : '#0a0512',
                opacity: isFuture ? 0.35 : 1,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </GlassPanel>
  );
}

export default function MonthlyCalendar({
  summaryByDate,
  months = 6,
  selectedDate,
  onDateClick,
}: MonthlyCalendarProps) {
  const monthDates = Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date;
  }).reverse();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}
    >
      {monthDates.map((monthDate) => (
        <MonthCard
          key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
          monthDate={monthDate}
          summaryByDate={summaryByDate}
          selectedDate={selectedDate}
          onDateClick={onDateClick}
        />
      ))}
    </div>
  );
}
