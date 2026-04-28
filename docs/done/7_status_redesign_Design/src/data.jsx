// Mock data and shared utilities for all variants

const SERVICES = [
  {
    id: 'svc_1',
    name: 'ArgoCD',
    url: 'http://argocd.advenoh.pe.kr',
    threshold_ms: 3000,
    currentStatus: 'OK',
    responseTime: 184,
    lastChecked: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    uptime30d: 99.87,
    created_at: '2024-11-14T02:30:00Z',
  },
  {
    id: 'svc_2',
    name: 'Inspire Me',
    url: 'https://inspire-me.advenoh.pe.kr',
    threshold_ms: 3000,
    currentStatus: 'OK',
    responseTime: 342,
    lastChecked: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    uptime30d: 99.94,
    created_at: '2024-10-02T09:15:00Z',
  },
  {
    id: 'svc_3',
    name: 'Personal Blog',
    url: 'https://blog.advenoh.pe.kr',
    threshold_ms: 3000,
    currentStatus: 'OK',
    responseTime: 128,
    lastChecked: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    uptime30d: 100.0,
    created_at: '2024-07-21T12:00:00Z',
  },
  {
    id: 'svc_4',
    name: 'Notes API',
    url: 'https://notes-api.advenoh.pe.kr',
    threshold_ms: 2000,
    currentStatus: 'WARN',
    responseTime: 2487,
    lastChecked: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    uptime30d: 98.73,
    created_at: '2025-02-08T18:45:00Z',
  },
];

// Seeded PRNG so results are deterministic
function mulberry32(seed) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build 365 days of summaryByDate (key = YYYY-MM-DD)
function buildSummaryByDate() {
  const rand = mulberry32(42);
  const map = new Map();
  const today = new Date();
  today.setHours(0,0,0,0);

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toLocalDateString(d);
    const entries = [];

    SERVICES.forEach((svc, idx) => {
      // Mostly OK, sprinkle WARN/ERROR
      let status = 'OK';
      const r = rand();
      // Make recent week have more variety for demo
      const isRecent = i < 14;
      if (isRecent) {
        if (r < 0.04) status = 'ERROR';
        else if (r < 0.12) status = 'WARN';
      } else {
        if (r < 0.008) status = 'ERROR';
        else if (r < 0.03) status = 'WARN';
      }
      // Specific incidents
      if (svc.id === 'svc_4' && (i === 2 || i === 3)) status = 'WARN';
      if (svc.id === 'svc_1' && i === 5) status = 'ERROR';
      if (svc.id === 'svc_3' && i === 9) status = 'WARN';

      const ok = status === 'OK' ? 24 : status === 'WARN' ? 20 : 14;
      const warn = status === 'WARN' ? 4 : status === 'ERROR' ? 3 : 0;
      const error = status === 'ERROR' ? 7 : 0;
      const avg = status === 'OK'
        ? Math.round(100 + rand() * 400)
        : status === 'WARN'
          ? Math.round(2400 + rand() * 600)
          : Math.round(4500 + rand() * 2000);

      entries.push({
        id: `${key}_${svc.id}`,
        service_id: svc.id,
        services: { name: svc.name },
        status,
        ok_count: ok,
        warn_count: warn,
        error_count: error,
        avg_response_time: avg,
      });
    });

    map.set(key, entries);
  }
  return map;
}

function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDailyStatus(summaryByDate, date) {
  const key = toLocalDateString(date);
  const day = summaryByDate.get(key) ?? [];
  if (day.length === 0) return 'NONE';
  if (day.some(s => s.status === 'ERROR')) return 'ERROR';
  if (day.some(s => s.status === 'WARN')) return 'WARN';
  return 'OK';
}

// Recent incidents (derived)
const INCIDENTS = [
  {
    id: 'inc_4',
    service: 'Notes API',
    status: 'WARN',
    started: '2026-04-17T03:12:00Z',
    resolved: '2026-04-17T05:44:00Z',
    duration_min: 152,
    title: 'Elevated response time (> 2400ms)',
    body: 'Slower-than-expected responses from upstream. Investigated and resolved after DB pool tuning.',
  },
  {
    id: 'inc_3',
    service: 'ArgoCD',
    status: 'ERROR',
    started: '2026-04-14T14:05:00Z',
    resolved: '2026-04-14T14:38:00Z',
    duration_min: 33,
    title: 'Ingress controller returning 503',
    body: 'Controller pod crash-looped during node drain. Recovered after pod rescheduling.',
  },
  {
    id: 'inc_2',
    service: 'Personal Blog',
    status: 'WARN',
    started: '2026-04-10T22:30:00Z',
    resolved: '2026-04-10T22:41:00Z',
    duration_min: 11,
    title: 'Brief latency spike',
    body: 'CDN edge cache miss storm after a deploy. Self-resolved in ~11 minutes.',
  },
  {
    id: 'inc_1',
    service: 'Notes API',
    status: 'WARN',
    started: '2026-04-08T11:20:00Z',
    resolved: '2026-04-08T12:10:00Z',
    duration_min: 50,
    title: 'Intermittent 502s',
    body: 'Upstream timeout during migration. Rolled forward; issue resolved.',
  },
];

// 90-day response time trace per service (for sparkline-ish if needed)
function buildResponseTrace(serviceId, days = 90) {
  const rand = mulberry32(
    Array.from(serviceId).reduce((a,c)=>a+c.charCodeAt(0),0)
  );
  const base = SERVICES.find(s=>s.id===serviceId)?.responseTime ?? 200;
  const arr = [];
  for (let i = 0; i < days; i++) {
    const noise = (rand() - 0.5) * base * 0.6;
    arr.push(Math.max(50, Math.round(base + noise)));
  }
  return arr;
}

const SUMMARY = buildSummaryByDate();

Object.assign(window, {
  SERVICES, SUMMARY, INCIDENTS,
  toLocalDateString, getDailyStatus, buildResponseTrace,
});
