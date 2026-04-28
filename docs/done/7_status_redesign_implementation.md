# Advenoh Status — Glass + Cyberpunk 리디자인 구현 문서

> **참조**: `1_status_prd.md` · 디자인 소스 `docs/start/Design/variants/glass.jsx`

---

## 1. 디자인 토큰 (`src/app/globals.css`)

### 1.1 CSS 변수 (Tailwind v4 `@theme`)

```css
@import 'tailwindcss';
@import 'pretendard/dist/web/static/pretendard.css';

@theme {
  /* Background */
  --color-bg-0: #0a0512;
  --color-bg-1: #150a26;
  --color-bg-2: #1f0d33;

  /* Text */
  --color-text: #f4f0ff;
  --color-text-muted: #a195c4;
  --color-text-dim: #6e6388;

  /* Neon accents */
  --color-accent: #ff4dcb;        /* magenta */
  --color-accent-2: #7c5cff;      /* electric violet */
  --color-cyan: #36f0ff;          /* neon cyan */

  /* Status */
  --color-ok: #5af0a8;
  --color-warn: #ffb84d;
  --color-error: #ff5b6e;

  /* Glass */
  --glass-bg: rgba(255, 255, 255, 0.045);
  --glass-bg-hi: rgba(255, 255, 255, 0.075);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-border-hi: rgba(255, 255, 255, 0.22);

  /* Fonts */
  --font-pretendard: 'Pretendard Variable', Pretendard, 'Geist',
                     -apple-system, BlinkMacSystemFont, sans-serif;
  --font-jetbrains-mono: 'JetBrains Mono', 'IBM Plex Mono', 'Geist Mono',
                          ui-monospace, monospace;
}
```

### 1.2 Body 배경 + 글로벌

```css
:root { color-scheme: dark; }

body {
  font-family: var(--font-pretendard);
  color: var(--color-text);
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(ellipse 80% 60% at 20% 0%, rgba(255,77,203,.18) 0%, transparent 60%),
    radial-gradient(ellipse 70% 60% at 90% 30%, rgba(54,240,255,.12) 0%, transparent 55%),
    radial-gradient(ellipse 90% 70% at 50% 100%, rgba(124,92,255,.16) 0%, transparent 60%),
    linear-gradient(180deg, var(--color-bg-0) 0%, var(--color-bg-1) 100%);
}

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.2); }
```

### 1.3 유틸 클래스 + 키프레임

```css
.mono { font-family: var(--font-jetbrains-mono); }

.glass-panel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    inset 0 -1px 0 rgba(0,0,0,.2),
    0 20px 40px rgba(0,0,0,.4);
}
.glass-panel-hi { background: var(--glass-bg-hi); }

.scanlines {
  position: fixed; inset: 0; pointer-events: none; z-index: 1;
  background-image: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(255,255,255,.012) 2px, rgba(255,255,255,.012) 3px
  );
  mix-blend-mode: overlay;
}

@keyframes gGlitch {
  0%, 92%, 100% { transform: translate(0,0); opacity: 0; }
  93% { transform: translate(-1px, 0); opacity: .55; }
  94% { transform: translate(1px, 0); opacity: .35; }
  95% { transform: translate(0, 0); opacity: 0; }
}

/* Fallback: backdrop-filter 미지원 브라우저 */
@supports not (backdrop-filter: blur(1px)) {
  .glass-panel { background: rgba(20, 10, 38, 0.85); }
  .glass-panel-hi { background: rgba(30, 14, 56, 0.9); }
}

@media (prefers-reduced-motion: reduce) {
  .scanlines { display: none; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .glass-panel { backdrop-filter: none; background: rgba(20, 10, 38, 0.92); }
}
```

---

## 2. 폰트 설정 (`src/app/layout.tsx`)

```tsx
import { JetBrains_Mono, Geist, Geist_Mono } from 'next/font/google';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

// 폴백용 (Pretendard 로드 실패 시)
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${jetbrainsMono.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GoogleAnalytics />
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
```

> Pretendard는 `globals.css`의 `@import`로 등록되어 `font-family: var(--font-pretendard)` 자동 적용.

---

## 3. 공통 컴포넌트 (`src/components/ui/`)

### 3.1 `GlassPanel.tsx`
```tsx
type Props = { hi?: boolean; className?: string; children: React.ReactNode };
export default function GlassPanel({ hi, className = '', children }: Props) {
  return (
    <div className={`glass-panel ${hi ? 'glass-panel-hi' : ''} ${className}`}>
      {children}
    </div>
  );
}
```

### 3.2 `StatusPill.tsx`
- `status: 'OK'|'WARN'|'ERROR'`, `glitch?: boolean`
- Label: `OPERATIONAL` / `DEGRADED` / `INCIDENT`
- 6px 글로우 dot + 상태 컬러 보더 + 반투명 배경
- `glitch && status !== 'OK'` 시 cyan 오버레이 + `gGlitch` 애니

### 3.3 `Sparkline.tsx`
- Props: `values: number[]`, `color: string`, `height?: number = 28`
- SVG `viewBox="0 0 100 100"` + `preserveAspectRatio="none"`
- gradient fill + stroke polyline (`vectorEffect="non-scaling-stroke"`)
- 접근성: `role="img"` + `aria-label="응답시간 추이"`

### 3.4 `HeroPanel.tsx`
- Props: `services: ServiceWithStatus[]`, `overall: StatusType`
- 좌측: eyebrow `// SYSTEM TELEMETRY` + 헤드라인 + 부제
- 우측 KPI 4개 grid: `ONLINE / DEGRADED / DOWN / AVG · ms`
- 우상단 데코 orb (radial gradient blur)
- 헤드라인 매핑:
  - `OK` → `All systems online`
  - `WARN` → `Partial degradation`
  - `ERROR` → `Active incident`

### 3.5 `IncidentTimeline.tsx`
- Props: `incidents: Incident[]`
- 좌측 24px 인덴트 + 라인 + 글로우 노드
- 각 항목: title + status pill + service + duration + 타임스탬프 (mono)

### 3.6 `ScanlinesOverlay.tsx`
- `<div className="scanlines" aria-hidden />`
- `AppLayout`에서 1회 마운트

---

## 4. 페이지/컴포넌트 리스킨

### 4.1 `Header.tsx`
- 흰 배경 → `border-b border-[var(--glass-border)]` + glass 배경
- 로고 38×38: conic-gradient padded square + 중앙 `A` 글리프
- 사이트명 `advenoh.status` (그라데이션 텍스트), 부제 `net.online` (mono uppercase dim)
- Nav: glass pill 컨테이너, 활성 탭은 `linear-gradient(135deg, accent, accent-2)` + neon shadow
- 우측: `<StatusPill status={overall} glitch />` 노출 (overall은 `useOverallStatus()` 또는 props)
- 로그인/유저 드롭다운: 다크 배경 + glass 보더

### 4.2 `app/page.tsx` + `Dashboard.tsx`
- 컨테이너: `bg-gray-50` 제거, `max-w-[1280px] mx-auto px-8`
- 순서:
  1. `<HeroPanel services={services} overall={overall} />`
  2. ServiceCard grid: `grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4`
  3. `<UptimeHeatmap services summaryByDate days={90} />`
  4. `<IncidentTimeline incidents={incidents} />`

### 4.3 `ServiceCard.tsx`
- `<GlassPanel className="p-[22px] relative overflow-hidden">`
- 비-OK일 때 상단 2px 네온 그라데이션 라인 + glow
- Header row: 서비스명 + 도메인(mono dim) + `<StatusPill />`
- `<Sparkline values={trace30d} color={statusColor} />` (옵션 prop으로 토글)
- 메트릭 3-col (mono): `LATENCY` / `UPTIME 30D` / `SLA`

### 4.4 `UptimeGrid.tsx` → `UptimeHeatmap.tsx` 재작성
- Props: `services: ServiceWithStatus[]`, `summaryByDate: SummaryByDate`, `days?: number = 90`
- 헤더: `// UPTIME · 90 DAY` (cyan mono) + 범례
- 서비스별 row: `grid-cols-[160px_1fr_70px]`
  - 좌: 서비스명
  - 중: 90개 셀 (`flex:1, height:26, border-radius:2, box-shadow: 0 0 4px {c}88`)
  - 우: 30일 uptime % (mono bold)
- title 속성으로 hover tooltip

### 4.5 `MonthlyCalendar.tsx`
- 라이트 카드 → `<GlassPanel className="p-[18px]">`
- 6개월 grid: `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`
- 카드 헤더: 월 이름 + 우측 월별 uptime % (cyan mono)
- 셀: `aspectRatio: 1`, status 컬러 + glow, today=cyan ring 1.5px, 미래일=`opacity:.35`
- 셀 텍스트는 dark text on light status pill (`#0a0512`)

### 4.6 `app/history/page.tsx`
- eyebrow `// ARCHIVE · 6 MONTH`, h1 그라데이션 `Uptime archive`
- 통계 패널 신규: `<GlassPanel>` 안 4 KPI grid (`OVERALL% / DAYS / DEGRADED / DOWN`)
- 기존 `MonthlyCalendar` + `DayDetailPanel` 유지하되 다크 토큰 적용

### 4.7 `app/admin/page.tsx` + `admin/ServiceList.tsx`
- eyebrow `// CONFIG`, h1 그라데이션 `Service control`
- `+ Add Service` 버튼: `linear-gradient(135deg, accent, accent-2)` + neon shadow
- 테이블 → `<GlassPanel>` wrap
- 컬럼: status dot · name · endpoint(cyan mono) · threshold · created · actions
- Edit/Delete 버튼: glass 보더, Delete는 error 컬러
- 모달(`ServiceFormModal`, `DeleteConfirmModal`, `LoginModal`): glass 다크 + 네온 강조 버튼

### 4.8 `Footer.tsx`
- `border-t border-[var(--glass-border)]`, mono dim
- 좌: `© ${year} advenoh.status · v∞`
- 우: `● online` (cyan) + `powered by next.js · supabase`

---

## 5. 데이터 Hook 신설

### 5.1 `src/hooks/useResponseTrace.ts`
```ts
// 서비스별 30일 응답시간 일별 평균 (raw 30 points)
export function useResponseTrace(serviceId: string, days = 30): {
  values: number[];
  loading: boolean;
}
```
- Supabase: `service_status_logs` where `service_id = ?` AND `timestamp >= now() - interval '30 days'`
- 일별 그룹화 → `avg(response_time)` → 시간 순 배열 반환

### 5.2 `src/hooks/useIncidents.ts`
```ts
export function useIncidents(days = 14): {
  incidents: Incident[];
  loading: boolean;
}
```
- Supabase: `service_status_logs` where `timestamp >= now() - interval '14 days'` order by service_id, timestamp
- 같은 service_id 내 연속된 비-OK(WARN/ERROR) 로그 → 한 인시던트로 묶음
- 첫 OK 로그가 들어오는 시점 = `resolved`, 진행 중이면 `resolved=null`
- duration_min = `(resolved - started) / 60_000`

### 5.3 `src/hooks/useOverallStatus.ts` (옵션)
```ts
export function useOverallStatus(): StatusType
```
- `useServices()` 결과에서 worst status 산출 (Header에서 사용)

### 5.4 타입 추가 (`src/types/index.ts`)
```ts
export interface Incident {
  id: string;
  service_id: string;
  service: string;
  status: 'WARN' | 'ERROR';
  started: string;
  resolved: string | null;
  duration_min: number | null;
  title: string;
  body?: string;
}

export interface ResponseTracePoint {
  date: string;       // YYYY-MM-DD
  avg_ms: number;
}

export interface ServiceWithStatus extends Service {
  currentStatus: StatusType;
  lastChecked: string | null;
  responseTime: number;     // 추가
  uptime30d: number;        // 추가 (0-100)
}
```

### 5.5 `src/lib/dateUtils.ts` 보강
```ts
export function calcUptime30d(
  summaryByDate: SummaryByDate,
  serviceId: string
): number {
  // 최근 30일 service_id별 OK 일수 / 총 tracked 일수 * 100
}
```

---

## 6. 반응형 & 접근성

### 6.1 Breakpoints (Tailwind 기본)
- `< sm (640px)`: Hero 1-col stack, ServiceCard 1-col, UptimeHeatmap의 셀 width 축소
- `sm ~ lg (640~1024px)`: ServiceCard 2-col, History calendar 2-col
- `>= lg (1024px)`: 디자인 기준 그대로 (`max-w-[1280px]`)
- Header nav: 모바일에서는 `dashboard/history` 텍스트만, admin은 드롭다운 안

### 6.2 접근성
- Status 컬러 대비 점검 (WCAG AA) — 어두운 배경 위 채도 높은 색은 텍스트 색상 강제
- `<svg>` Sparkline: `role="img"` + `aria-label`
- 포커스 링: `outline: 2px solid var(--color-cyan); outline-offset: 2px`
- `prefers-reduced-motion: reduce` → glitch + scanlines 비활성 (CSS에서 처리)
- `prefers-reduced-transparency: reduce` 및 `@supports not (backdrop-filter)` → opaque 폴백

---

## 7. 변경 파일 요약

| 파일 | Action |
|---|---|
| `package.json` | `pretendard` 의존성 추가 |
| `src/app/globals.css` | 디자인 토큰 + 유틸 + 폴백 |
| `src/app/layout.tsx` | JetBrains Mono + 폴백 폰트 |
| `src/app/page.tsx` | 컨테이너 다크화 |
| `src/app/history/page.tsx` | 통계 패널 추가 |
| `src/app/admin/page.tsx` | 그라데이션 헤딩 + 버튼 |
| `src/components/AppLayout.tsx` | ScanlinesOverlay 마운트 |
| `src/components/Header.tsx` | 재작성 |
| `src/components/Dashboard.tsx` | 재작성 (HeroPanel 사용) |
| `src/components/ServiceCard.tsx` | 재작성 |
| `src/components/StatusBadge.tsx` | StatusPill로 흡수 후 제거 |
| `src/components/UptimeGrid.tsx` | `UptimeHeatmap.tsx`로 재작성 |
| `src/components/MonthlyCalendar.tsx` | 다크화 |
| `src/components/DayDetailPanel.tsx` | 다크화 |
| `src/components/Footer.tsx` | 다크화 |
| `src/components/LoginModal.tsx` | Glass 모달 |
| `src/components/admin/ServiceList.tsx` | Glass 테이블 + status dot |
| `src/components/admin/ServiceFormModal.tsx` | 다크 모달 |
| `src/components/admin/DeleteConfirmModal.tsx` | 다크 모달 |
| `src/components/admin/AdminSidebar.tsx` | 다크 사이드바 |
| `src/components/ui/GlassPanel.tsx` | 신규 |
| `src/components/ui/StatusPill.tsx` | 신규 |
| `src/components/ui/Sparkline.tsx` | 신규 |
| `src/components/ui/HeroPanel.tsx` | 신규 |
| `src/components/ui/IncidentTimeline.tsx` | 신규 |
| `src/components/ui/ScanlinesOverlay.tsx` | 신규 |
| `src/hooks/useResponseTrace.ts` | 신규 |
| `src/hooks/useIncidents.ts` | 신규 |
| `src/hooks/useOverallStatus.ts` | 신규 (옵션) |
| `src/hooks/useServices.ts` | `responseTime`, `uptime30d` 필드 보강 |
| `src/lib/dateUtils.ts` | `calcUptime30d` 추가 |
| `src/types/index.ts` | `Incident`, `ResponseTracePoint` 타입 추가 |
