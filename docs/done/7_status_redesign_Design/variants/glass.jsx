// Variant 3: Glass + Cyberpunk hybrid.
// Soft glassmorphism panels over a dark gradient with neon magenta/cyan accents.
// Subtle scanlines + an occasional glitch on the system status badge.

const G_COLORS = {
  bg0: '#0a0512',
  bg1: '#150a26',
  bg2: '#1f0d33',
  text: '#f4f0ff',
  textMuted: '#a195c4',
  textDim: '#6e6388',
  accent: '#ff4dcb',         // neon magenta
  accent2: '#7c5cff',        // electric violet
  cyan: '#36f0ff',           // neon cyan
  ok: '#5af0a8',
  warn: '#ffb84d',
  error: '#ff5b6e',
  glassBg: 'rgba(255,255,255,.045)',
  glassBgHi: 'rgba(255,255,255,.075)',
  glassBorder: 'rgba(255,255,255,.12)',
  glassBorderHi: 'rgba(255,255,255,.22)',
};

const glassStyles = {
  page: {
    minHeight: '100vh',
    background: `
      radial-gradient(ellipse 80% 60% at 20% 0%, rgba(255,77,203,.18) 0%, transparent 60%),
      radial-gradient(ellipse 70% 60% at 90% 30%, rgba(54,240,255,.12) 0%, transparent 55%),
      radial-gradient(ellipse 90% 70% at 50% 100%, rgba(124,92,255,.16) 0%, transparent 60%),
      linear-gradient(180deg, ${G_COLORS.bg0} 0%, ${G_COLORS.bg1} 100%)
    `,
    color: G_COLORS.text,
    fontFamily: "'Pretendard', 'Geist', 'Inter Tight', sans-serif",
    fontSize: 14,
    position: 'relative',
  },
  scanlines: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,.012) 2px, rgba(255,255,255,.012) 3px)`,
    mixBlendMode: 'overlay',
  },
};

function G_GlassPanel({ children, style, hi }) {
  return (
    <div style={{
      background: hi ? G_COLORS.glassBgHi : G_COLORS.glassBg,
      border: `1px solid ${G_COLORS.glassBorder}`,
      borderRadius: 14,
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      boxShadow: `
        0 1px 0 rgba(255,255,255,.08) inset,
        0 -1px 0 rgba(0,0,0,.2) inset,
        0 20px 40px rgba(0,0,0,.4)
      `,
      ...style,
    }}>{children}</div>
  );
}

function G_StatusPill({ status, glitch }) {
  const color = status === 'OK' ? G_COLORS.ok : status === 'WARN' ? G_COLORS.warn : G_COLORS.error;
  const label = status === 'OK' ? 'OPERATIONAL' : status === 'WARN' ? 'DEGRADED' : 'INCIDENT';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '5px 11px',
      background: `${color}1c`,
      border: `1px solid ${color}55`,
      borderRadius: 999,
      fontSize: 10, letterSpacing: '.2em', fontWeight: 700,
      color, position: 'relative',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: color,
        boxShadow: `0 0 8px ${color}, 0 0 16px ${color}88`,
      }} />
      {label}
      {glitch && status !== 'OK' && (
        <span style={{
          position: 'absolute', inset: 0, padding: '5px 11px',
          color: G_COLORS.cyan, mixBlendMode: 'screen',
          animation: 'gGlitch 2.4s steps(1) infinite',
          pointerEvents: 'none', overflow: 'hidden',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 6, height: 6 }} />{label}
        </span>
      )}
    </span>
  );
}

function G_Header({ page, setPage, overall }) {
  return (
    <header style={{ position: 'relative', zIndex: 2 }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '20px 32px',
        display: 'flex', alignItems: 'center', gap: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `conic-gradient(from 180deg, ${G_COLORS.accent}, ${G_COLORS.accent2}, ${G_COLORS.cyan}, ${G_COLORS.accent})`,
            padding: 1.5,
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: 9,
              background: G_COLORS.bg0,
              display: 'grid', placeItems: 'center',
              fontWeight: 800, fontSize: 18, color: G_COLORS.text,
              letterSpacing: '-.04em',
            }}>A</div>
          </div>
          <div>
            <div style={{
              fontWeight: 700, fontSize: 16, letterSpacing: '-.01em',
              background: `linear-gradient(90deg, ${G_COLORS.text}, ${G_COLORS.accent} 130%)`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>advenoh.status</div>
            <div style={{
              fontSize: 10, letterSpacing: '.2em', color: G_COLORS.textDim,
              textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace',
            }}>net.online</div>
          </div>
        </div>

        <nav style={{ display: 'flex', marginLeft: 'auto', gap: 4,
          padding: 4, background: G_COLORS.glassBg, borderRadius: 10,
          border: `1px solid ${G_COLORS.glassBorder}`, backdropFilter: 'blur(12px)',
        }}>
          {['dashboard', 'history', 'admin'].map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                background: page === p
                  ? `linear-gradient(135deg, ${G_COLORS.accent}, ${G_COLORS.accent2})`
                  : 'transparent',
                border: 'none', color: page === p ? '#fff' : G_COLORS.textMuted,
                fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
                letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600,
                padding: '8px 18px', borderRadius: 7,
                boxShadow: page === p ? `0 4px 16px ${G_COLORS.accent}55` : 'none',
              }}
            >{p}</button>
          ))}
        </nav>

        <G_StatusPill status={overall} glitch />
      </div>
    </header>
  );
}

// --------- DASHBOARD ---------

function G_Hero({ services, overall }) {
  const okCount = services.filter(s=>s.currentStatus==='OK').length;
  const warnCount = services.filter(s=>s.currentStatus==='WARN').length;
  const errCount = services.filter(s=>s.currentStatus==='ERROR').length;
  const avgResponse = Math.round(services.reduce((a,s)=>a+s.responseTime,0)/services.length);

  const headline = overall === 'OK' ? 'All systems online'
                 : overall === 'WARN' ? 'Partial degradation' : 'Active incident';

  return (
    <G_GlassPanel hi style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
      {/* Decorative orb */}
      <div style={{
        position: 'absolute', top: -80, right: -80, width: 280, height: 280,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${G_COLORS.accent}55, transparent 70%)`,
        pointerEvents: 'none', filter: 'blur(20px)',
      }} />

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 36, alignItems: 'center' }}>
        <div>
          <div style={{
            fontSize: 11, letterSpacing: '.24em', color: G_COLORS.cyan,
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 12,
            fontFamily: 'JetBrains Mono, monospace',
          }}>// SYSTEM TELEMETRY</div>
          <h1 style={{
            fontSize: 44, fontWeight: 700, margin: '0 0 10px',
            letterSpacing: '-.025em', lineHeight: 1.05,
            background: `linear-gradient(180deg, ${G_COLORS.text} 30%, ${G_COLORS.textMuted} 100%)`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>{headline}</h1>
          <div style={{ fontSize: 14, color: G_COLORS.textMuted, lineHeight: 1.55, maxWidth: 420 }}>
            {services.length} services monitored across edge & origin. Telemetry pulse every 60min, last refreshed {new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0,5)}.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            ['ONLINE',    okCount,   G_COLORS.ok],
            ['DEGRADED',  warnCount, G_COLORS.warn],
            ['DOWN',      errCount,  G_COLORS.error],
            ['AVG · ms',  avgResponse, G_COLORS.cyan],
          ].map(([label, val, color]) => (
            <div key={label} style={{
              background: 'rgba(0,0,0,.25)',
              border: `1px solid ${G_COLORS.glassBorder}`,
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{
                fontSize: 9, letterSpacing: '.2em', color: G_COLORS.textDim,
                fontWeight: 700, marginBottom: 8,
                fontFamily: 'JetBrains Mono, monospace',
              }}>{label}</div>
              <div style={{
                fontSize: 28, fontWeight: 700, color,
                letterSpacing: '-.02em',
                fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 18px ${color}55`,
              }}>{typeof val === 'number' && val < 100 ? String(val).padStart(2, '0') : val}</div>
            </div>
          ))}
        </div>
      </div>
    </G_GlassPanel>
  );
}

function G_Sparkline({ values, color, height = 28 }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spfill-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,100 ${points} 100,100`} fill={`url(#spfill-${color})`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function G_ServiceCard({ service, showResponseTimes }) {
  const sc = service.currentStatus;
  const color = sc === 'OK' ? G_COLORS.ok : sc === 'WARN' ? G_COLORS.warn : G_COLORS.error;
  const trace = window.buildResponseTrace(service.id, 30);

  return (
    <G_GlassPanel style={{ padding: 22, position: 'relative', overflow: 'hidden' }}>
      {sc !== 'OK' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 12px ${color}`,
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.015em' }}>
            {service.name}
          </div>
          <div style={{
            fontSize: 11, color: G_COLORS.textDim,
            fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
          }}>{service.url.replace(/^https?:\/\//, '')}</div>
        </div>
        <G_StatusPill status={sc} />
      </div>

      {showResponseTimes && (
        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <G_Sparkline values={trace} color={color} height={36} />
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        marginTop: 14, paddingTop: 14,
        borderTop: `1px solid ${G_COLORS.glassBorder}`,
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '.16em', color: G_COLORS.textDim, fontWeight: 600 }}>LATENCY</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: G_COLORS.text, marginTop: 2 }}>
            {service.responseTime}<span style={{ color: G_COLORS.textDim, fontSize: 11, fontWeight: 400 }}>ms</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '.16em', color: G_COLORS.textDim, fontWeight: 600 }}>UPTIME 30D</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: G_COLORS.text, marginTop: 2 }}>
            {service.uptime30d}<span style={{ color: G_COLORS.textDim, fontSize: 11, fontWeight: 400 }}>%</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '.16em', color: G_COLORS.textDim, fontWeight: 600 }}>SLA</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: G_COLORS.text, marginTop: 2 }}>
            {service.threshold_ms}<span style={{ color: G_COLORS.textDim, fontSize: 11, fontWeight: 400 }}>ms</span>
          </div>
        </div>
      </div>
    </G_GlassPanel>
  );
}

function G_UptimeHeatmap({ services, summaryByDate, days = 90 }) {
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setHours(0,0,0,0);
    d.setDate(d.getDate() - (days - 1 - i));
    return d;
  });

  return (
    <G_GlassPanel style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{
            fontSize: 11, letterSpacing: '.22em', color: G_COLORS.cyan,
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
            textTransform: 'uppercase', marginBottom: 4,
          }}>// UPTIME · 90 DAY</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Service health timeline</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 10, alignItems: 'center', color: G_COLORS.textMuted }}>
          {[['ok','OK'],['warn','WARN'],['error','DOWN']].map(([k,l])=>(
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '.1em' }}>
              <span style={{
                width: 10, height: 10, borderRadius: 3,
                background: G_COLORS[k],
                boxShadow: `0 0 6px ${G_COLORS[k]}aa`,
              }} />{l}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {services.map((svc) => (
          <div key={svc.id} style={{
            display: 'grid', gridTemplateColumns: '160px 1fr 70px',
            gap: 14, alignItems: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{svc.name}</div>
            <div style={{ display: 'flex', gap: 2, height: 26 }}>
              {dates.map((d, di) => {
                const summ = summaryByDate.get(window.toLocalDateString(d))?.find(s=>s.service_id===svc.id);
                const status = summ?.status ?? 'NONE';
                if (status === 'NONE') {
                  return <div key={di} style={{ flex: 1, background: 'rgba(255,255,255,.04)', borderRadius: 2 }} />;
                }
                const c = G_COLORS[status.toLowerCase()];
                return (
                  <div key={di}
                    title={`${d.toLocaleDateString('ko-KR')} · ${status} · ${summ?.avg_response_time||'—'}ms`}
                    style={{
                      flex: 1, minWidth: 4, borderRadius: 2,
                      background: c,
                      boxShadow: `0 0 4px ${c}88`,
                    }}
                  />
                );
              })}
            </div>
            <div style={{
              fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
              textAlign: 'right', color: G_COLORS.text, fontWeight: 600,
            }}>{svc.uptime30d}<span style={{ color: G_COLORS.textDim, fontWeight: 400 }}>%</span></div>
          </div>
        ))}
      </div>
    </G_GlassPanel>
  );
}

function G_IncidentTimeline({ incidents }) {
  return (
    <G_GlassPanel style={{ padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: 11, letterSpacing: '.22em', color: G_COLORS.cyan,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
          textTransform: 'uppercase', marginBottom: 4,
        }}>// INCIDENTS · 14 DAY</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Recent timeline</div>
      </div>

      <div style={{ position: 'relative', paddingLeft: 24 }}>
        <div style={{
          position: 'absolute', left: 7, top: 6, bottom: 6, width: 1,
          background: `linear-gradient(180deg, ${G_COLORS.accent}66, ${G_COLORS.accent2}33, transparent)`,
        }} />
        {incidents.map((inc) => {
          const c = inc.status === 'ERROR' ? G_COLORS.error : G_COLORS.warn;
          return (
            <div key={inc.id} style={{ position: 'relative', paddingBottom: 22 }}>
              <div style={{
                position: 'absolute', left: -24, top: 4, width: 16, height: 16,
                borderRadius: '50%', background: c,
                boxShadow: `0 0 0 3px ${G_COLORS.bg1}, 0 0 14px ${c}, 0 0 24px ${c}66`,
              }} />
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 12,
                flexWrap: 'wrap', marginBottom: 4,
              }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{inc.title}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 9,
                  letterSpacing: '.16em', fontWeight: 700,
                  background: `${c}22`, color: c, border: `1px solid ${c}55`,
                }}>{inc.status} · {inc.service}</span>
                <span style={{
                  fontSize: 11, color: G_COLORS.textDim,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  resolved · {inc.duration_min}m
                </span>
              </div>
              <div style={{ fontSize: 12, color: G_COLORS.textMuted, lineHeight: 1.6, maxWidth: 720 }}>
                {inc.body}
              </div>
              <div style={{
                fontSize: 10, color: G_COLORS.textDim, marginTop: 4,
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.04em',
              }}>
                {new Date(inc.started).toISOString().slice(0,16).replace('T',' ')} → {new Date(inc.resolved).toISOString().slice(11,16)}
              </div>
            </div>
          );
        })}
      </div>
    </G_GlassPanel>
  );
}

// --------- HISTORY ---------

function G_MonthCalendar({ monthDate, summaryByDate }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysIn = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date(); today.setHours(0,0,0,0);

  let ok = 0, tracked = 0;
  for (let i = 1; i <= daysIn; i++) {
    const d = new Date(year, month, i);
    if (d.getTime() > today.getTime()) continue;
    const s = window.getDailyStatus(summaryByDate, d);
    if (s !== 'NONE') tracked++;
    if (s === 'OK') ok++;
  }
  const pct = tracked ? ((ok / tracked) * 100).toFixed(1) : '—';

  return (
    <G_GlassPanel style={{ padding: 18 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 12,
      }}>
        <div style={{
          fontWeight: 700, fontSize: 14, letterSpacing: '-.005em',
        }}>{monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <div style={{
          fontSize: 11, color: G_COLORS.cyan,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
        }}>{pct}%</div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
      }}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} style={{
            fontSize: 9, color: G_COLORS.textDim,
            textAlign: 'center', padding: '4px 0', letterSpacing: '.1em', fontWeight: 600,
          }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_,i)=><div key={`e${i}`} />)}
        {Array.from({ length: daysIn }).map((_, i) => {
          const d = new Date(year, month, i+1);
          const isFuture = d.getTime() > today.getTime();
          const status = isFuture ? 'NONE' : window.getDailyStatus(summaryByDate, d);
          const isToday = d.getTime() === today.getTime();
          const c = G_COLORS[status.toLowerCase()] || 'rgba(255,255,255,.05)';
          return (
            <div key={i} title={`${d.toLocaleDateString('ko-KR')} · ${status}`} style={{
              aspectRatio: '1',
              borderRadius: 6,
              background: isFuture ? 'rgba(255,255,255,.03)' : c,
              boxShadow: !isFuture && status !== 'NONE' ? `0 0 8px ${c}88, inset 0 1px 0 rgba(255,255,255,.15)` : 'none',
              border: isToday ? `1.5px solid ${G_COLORS.cyan}` : '1px solid rgba(255,255,255,.05)',
              display: 'grid', placeItems: 'center',
              fontSize: 10, fontWeight: 600,
              color: isFuture ? G_COLORS.textDim : status === 'NONE' ? G_COLORS.textDim : '#0a0512',
              opacity: isFuture ? .35 : 1,
              fontFamily: 'JetBrains Mono, monospace',
            }}>{i+1}</div>
          );
        })}
      </div>
    </G_GlassPanel>
  );
}

function G_HistoryPage({ summaryByDate }) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    d.setDate(1);
    return d;
  });

  const totals = { OK: 0, WARN: 0, ERROR: 0, NONE: 0 };
  for (const m of months) {
    const year = m.getFullYear(), mon = m.getMonth();
    const daysIn = new Date(year, mon + 1, 0).getDate();
    for (let i = 1; i <= daysIn; i++) {
      const d = new Date(year, mon, i);
      if (d.getTime() > Date.now()) continue;
      const s = window.getDailyStatus(summaryByDate, d);
      totals[s]++;
    }
  }
  const tracked = totals.OK + totals.WARN + totals.ERROR;
  const uptimePct = tracked ? ((totals.OK / tracked) * 100).toFixed(2) : '—';

  return (
    <div>
      <div style={{
        fontSize: 11, letterSpacing: '.24em', color: G_COLORS.cyan,
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
        textTransform: 'uppercase', marginBottom: 8,
      }}>// ARCHIVE · 6 MONTH</div>
      <h1 style={{
        fontSize: 40, fontWeight: 700, margin: '0 0 8px',
        letterSpacing: '-.025em', lineHeight: 1.1,
        background: `linear-gradient(90deg, ${G_COLORS.text}, ${G_COLORS.accent} 130%)`,
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
      }}>Uptime archive</h1>
      <div style={{ color: G_COLORS.textMuted, fontSize: 14, marginBottom: 28 }}>
        Daily aggregate health across all monitored services.
      </div>

      <G_GlassPanel style={{ padding: 24, marginBottom: 24 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
        }}>
          {[
            ['OVERALL', `${uptimePct}%`, G_COLORS.ok],
            ['DAYS', tracked, G_COLORS.cyan],
            ['DEGRADED', totals.WARN, G_COLORS.warn],
            ['DOWN', totals.ERROR, G_COLORS.error],
          ].map(([label, val, c], i) => (
            <div key={i}>
              <div style={{
                fontSize: 9, letterSpacing: '.22em', color: G_COLORS.textDim,
                fontWeight: 700, marginBottom: 8, fontFamily: 'JetBrains Mono, monospace',
              }}>{label}</div>
              <div style={{
                fontSize: 32, fontWeight: 700, color: c,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em',
                textShadow: `0 0 18px ${c}55`,
              }}>{val}</div>
            </div>
          ))}
        </div>
      </G_GlassPanel>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {months.map((m, i) => <G_MonthCalendar key={i} monthDate={m} summaryByDate={summaryByDate} />)}
      </div>
    </div>
  );
}

// --------- ADMIN ---------

function G_AdminPage({ services }) {
  return (
    <div>
      <div style={{
        fontSize: 11, letterSpacing: '.24em', color: G_COLORS.cyan,
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
        textTransform: 'uppercase', marginBottom: 8,
      }}>// CONFIG</div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontSize: 40, fontWeight: 700, margin: '0 0 6px',
            letterSpacing: '-.025em', lineHeight: 1.1,
            background: `linear-gradient(90deg, ${G_COLORS.text}, ${G_COLORS.accent} 130%)`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>Service control</h1>
          <div style={{ color: G_COLORS.textMuted, fontSize: 14 }}>
            {services.length} endpoints registered
          </div>
        </div>
        <button style={{
          background: `linear-gradient(135deg, ${G_COLORS.accent}, ${G_COLORS.accent2})`,
          color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 10,
          fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
          letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer',
          boxShadow: `0 8px 24px ${G_COLORS.accent}55`,
        }}>+ Add service</button>
      </div>

      <G_GlassPanel>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.2fr 2fr 110px 130px 130px',
          gap: 20, padding: '14px 24px',
          borderBottom: `1px solid ${G_COLORS.glassBorder}`,
          fontSize: 9, letterSpacing: '.22em', color: G_COLORS.textDim,
          textTransform: 'uppercase', fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <span>Service</span><span>Endpoint</span><span>Threshold</span><span>Created</span><span style={{textAlign:'right'}}>Actions</span>
        </div>
        {services.map((s, i) => {
          const c = s.currentStatus === 'OK' ? G_COLORS.ok : s.currentStatus === 'WARN' ? G_COLORS.warn : G_COLORS.error;
          return (
            <div key={s.id} style={{
              display: 'grid', gridTemplateColumns: '1.2fr 2fr 110px 130px 130px',
              gap: 20, padding: '16px 24px',
              borderTop: i === 0 ? 'none' : `1px solid ${G_COLORS.glassBorder}`,
              alignItems: 'center', fontSize: 13,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: c,
                  boxShadow: `0 0 10px ${c}, 0 0 20px ${c}55`,
                }} />
                <span style={{ fontWeight: 600 }}>{s.name}</span>
              </div>
              <a href={s.url} target="_blank" rel="noopener" style={{
                color: G_COLORS.cyan, textDecoration: 'none',
                fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
              }}>{s.url}</a>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                color: G_COLORS.text, fontSize: 12,
              }}>{s.threshold_ms}ms</span>
              <span style={{
                color: G_COLORS.textDim, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              }}>{new Date(s.created_at).toISOString().slice(0,10)}</span>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={G_btnStyle()}>Edit</button>
                <button style={{...G_btnStyle(), color: G_COLORS.error, borderColor: `${G_COLORS.error}66`}}>Delete</button>
              </div>
            </div>
          );
        })}
      </G_GlassPanel>
    </div>
  );
}

function G_btnStyle() {
  return {
    background: 'rgba(255,255,255,.04)',
    border: `1px solid ${G_COLORS.glassBorder}`,
    color: G_COLORS.text, padding: '6px 14px', borderRadius: 7,
    fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
    letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer',
    backdropFilter: 'blur(8px)',
  };
}

function G_Footer() {
  return (
    <footer style={{
      marginTop: 64, padding: '28px 32px',
      maxWidth: 1280, margin: '64px auto 0',
      borderTop: `1px solid ${G_COLORS.glassBorder}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: 11, color: G_COLORS.textDim,
      fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.06em',
    }}>
      <span>© 2026 advenoh.status · v∞</span>
      <span style={{ display: 'flex', gap: 16 }}>
        <span style={{ color: G_COLORS.cyan }}>● online</span>
        <span>powered by next.js · supabase</span>
      </span>
    </footer>
  );
}

function GlassVariant(props) {
  const { services, summaryByDate, incidents, page, setPage,
          showIncidents, showResponseTimes } = props;

  const overall = services.some(s=>s.currentStatus==='ERROR') ? 'ERROR'
                : services.some(s=>s.currentStatus==='WARN') ? 'WARN' : 'OK';

  return (
    <div style={glassStyles.page}>
      <style>{`
        @keyframes gGlitch {
          0%, 92%, 100% { transform: translate(0,0); opacity: 0; }
          93% { transform: translate(-1px, 0); opacity: .55; }
          94% { transform: translate(1px, 0); opacity: .35; }
          95% { transform: translate(0, 0); opacity: 0; }
        }
      `}</style>
      <div style={glassStyles.scanlines} />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <G_Header page={page} setPage={setPage} overall={overall} />

        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 0' }}>
          {page === 'dashboard' && (
            <React.Fragment>
              <div style={{ marginBottom: 22 }}>
                <G_Hero services={services} overall={overall} />
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16, marginBottom: 22,
              }}>
                {services.map(s => (
                  <G_ServiceCard key={s.id} service={s} showResponseTimes={showResponseTimes} />
                ))}
              </div>
              <div style={{ marginBottom: 22 }}>
                <G_UptimeHeatmap services={services} summaryByDate={summaryByDate} days={90} />
              </div>
              {showIncidents && <G_IncidentTimeline incidents={incidents} />}
            </React.Fragment>
          )}
          {page === 'history' && <G_HistoryPage summaryByDate={summaryByDate} />}
          {page === 'admin' && <G_AdminPage services={services} />}
        </main>

        <G_Footer />
      </div>
    </div>
  );
}

window.GlassVariant = GlassVariant;
