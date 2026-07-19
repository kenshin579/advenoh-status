'use client';

import { useState, useMemo } from 'react';
import { useUptimeData, type SummaryByDate } from '@/hooks/useServices';
import MonthlyCalendar from '@/components/MonthlyCalendar';
import DayDetailPanel from '@/components/DayDetailPanel';
import GlassPanel from '@/components/ui/GlassPanel';
import { toLocalDateString, daysToCoverMonths } from '@/lib/dateUtils';
import type { StatusType } from '@/types';

function getDailyStatus(summaryByDate: SummaryByDate, date: Date): StatusType | 'NONE' {
  const day = summaryByDate.get(toLocalDateString(date)) ?? [];
  if (day.length === 0) return 'NONE';
  if (day.some((s) => s.status === 'ERROR')) return 'ERROR';
  if (day.some((s) => s.status === 'WARN')) return 'WARN';
  return 'OK';
}

function calcSummaryTotals(summaryByDate: SummaryByDate, months = 6) {
  const totals = { OK: 0, WARN: 0, ERROR: 0, NONE: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let m = 0; m < months; m++) {
    const monthDate = new Date(today);
    monthDate.setMonth(monthDate.getMonth() - (months - 1 - m));
    const year = monthDate.getFullYear();
    const mon = monthDate.getMonth();
    const daysIn = new Date(year, mon + 1, 0).getDate();
    for (let i = 1; i <= daysIn; i++) {
      const d = new Date(year, mon, i);
      if (d.getTime() > today.getTime()) continue;
      totals[getDailyStatus(summaryByDate, d)]++;
    }
  }

  return totals;
}

export default function HistoryPage() {
  const { summaryByDate, loading } = useUptimeData(daysToCoverMonths(6));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const totals = useMemo(() => calcSummaryTotals(summaryByDate, 6), [summaryByDate]);
  const tracked = totals.OK + totals.WARN + totals.ERROR;
  const uptimePct = tracked ? ((totals.OK / tracked) * 100).toFixed(2) : '—';

  const handleDateClick = (date: Date) => {
    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mono" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.2em', fontSize: 12 }}>
          // LOADING ARCHIVE
        </div>
      </main>
    );
  }

  const kpis: { label: string; value: string | number; color: string }[] = [
    { label: 'OVERALL', value: `${uptimePct}${tracked ? '%' : ''}`, color: 'var(--color-ok)' },
    { label: 'DAYS', value: tracked, color: 'var(--color-cyan)' },
    { label: 'DEGRADED', value: totals.WARN, color: 'var(--color-warn)' },
    { label: 'DOWN', value: totals.ERROR, color: 'var(--color-error)' },
  ];

  return (
    <main style={{ minHeight: '100vh' }}>
      <div className="mx-auto" style={{ maxWidth: 1280, padding: '24px 32px 0' }}>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.24em',
            color: 'var(--color-cyan)',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          // ARCHIVE · 6 MONTH
        </div>
        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            margin: '0 0 8px',
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            background: 'linear-gradient(90deg, var(--color-text), var(--color-accent) 130%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Uptime archive
        </h1>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 28 }}>
          Daily aggregate health across all monitored services.
        </div>

        <GlassPanel style={{ padding: 24, marginBottom: 24 }}>
          <div
            className="kpi-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
            }}
          >
            {kpis.map(({ label, value, color }) => (
              <div key={label}>
                <div
                  className="mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    color: 'var(--color-text-dim)',
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                    textShadow: `0 0 18px color-mix(in srgb, ${color} 33%, transparent)`,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <MonthlyCalendar
          summaryByDate={summaryByDate}
          months={6}
          selectedDate={selectedDate}
          onDateClick={handleDateClick}
        />
        <DayDetailPanel selectedDate={selectedDate} summaryByDate={summaryByDate} />

        <style>{`
          @media (max-width: 640px) {
            .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}</style>
      </div>
    </main>
  );
}
