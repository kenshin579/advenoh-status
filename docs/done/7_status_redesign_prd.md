# Advenoh Status — Glass + Cyberpunk 리디자인 PRD

> **목표**: 현재 라이트 테마(흰 배경 + Tailwind 기본 색)로 구성된 Status 페이지를 `docs/start/Design/variants/glass.jsx`에 정의된 **Glass + Cyberpunk 하이브리드** 테마로 전환한다.
>
> **참조 디자인 소스**
> - `docs/start/Design/Advenoh Status Redesign.html` — 폰트/스캔라인/패널 등 글로벌 스타일
> - `docs/start/Design/src/data.jsx` — Mock 데이터 모델 (Service, SUMMARY, INCIDENTS, Sparkline trace)
> - `docs/start/Design/variants/glass.jsx` — Glass variant 모든 컴포넌트 구현
> - `docs/start/Design/src/app.jsx` — 페이지 라우팅 및 옵션(Incidents/Sparkline 토글)

---

## 1. 디자인 컨셉 요약

| 항목 | 내용 |
|---|---|
| 컨셉 | Soft glassmorphism + Cyberpunk neon accent |
| 무드 | Dark, futuristic, telemetry-grade |
| 배경 | 라디얼 그라데이션(보라/마젠타/시안) + 베이스 다크 그라데이션 |
| 강조색 | Neon Magenta(`#ff4dcb`), Electric Violet(`#7c5cff`), Neon Cyan(`#36f0ff`) |
| 상태색 | OK `#5af0a8` / WARN `#ffb84d` / ERROR `#ff5b6e` (모두 네온 글로우) |
| 텍스트 | `#f4f0ff` (primary) / `#a195c4` (muted) / `#6e6388` (dim) |
| 패널 | `rgba(255,255,255,.045)` + `backdrop-filter: blur(20px) saturate(140%)` |
| 폰트 (sans) | Pretendard, Geist, Inter Tight 폴백 |
| 폰트 (mono) | JetBrains Mono, IBM Plex Mono, Geist Mono |
| 효과 | Scanlines(2px stripe), 미세 Glitch 애니, 네온 glow(textShadow/boxShadow) |

---

## 2. 현재 상태 vs 변경 목표

| 영역 | 현재 (`src/`) | 변경 후 |
|---|---|---|
| 전역 테마 | `globals.css` 단일 라인(`@import 'tailwindcss'`) | 다크 토큰, gradient bg, scanlines, glow 유틸 정의 |
| 폰트 | `Geist`, `Geist_Mono` (next/font/google) | `Pretendard` 추가, mono는 `JetBrains_Mono`로 교체 |
| 색상 시스템 | Tailwind 기본 (`bg-white`, `text-gray-900` 등) | CSS 변수 기반 다크 팔레트, status 글로우 컬러 |
| 메인 컨테이너 | `bg-gray-50`, `max-w-6xl` | 다크 gradient page, `max-w-[1280px]` |
| Header | 흰 배경 navbar, 단순 텍스트 로고 | 그라데이션 로고(conic), 글래스 nav-pill, 전체 상태 Pill |
| Dashboard 헤더 | 단색 배너 ("All Systems Operational") | Hero 패널: 헤드라인 + 4 KPI(ONLINE/DEGRADED/DOWN/AVG ms) |
| Service Card | 흰 카드 + 텍스트 | Glass 패널 + Sparkline(30d) + LATENCY/UPTIME 30D/SLA 3-col 메트릭 + 상단 네온 라인(비-OK일 때) |
| Status Badge | dot + 텍스트 | 네온 dot(box-shadow glow) + 라벨 + 비-OK 시 glitch 오버레이 (옵션) |
| Uptime 90일 | flat 색 셀, 단일 라인 | 서비스별 row 분리, 셀에 글로우, 우측 30d uptime % |
| Monthly Calendar | 라이트 카드 6개월 | Glass 카드 6개월, today=cyan ring, 월별 uptime % 표시 |
| Footer | 흰 배경 단순 텍스트 | 모노 폰트 + cyan 온라인 인디케이터 |
| Admin Service List | 흰 테이블 | Glass 테이블 + status dot + 그라데이션 "+ Add" 버튼 |
| LoginModal | 라이트 모달 | Glass 모달 (blur + dark) |
| Incidents Timeline | **없음** | Dashboard 하단에 14d 인시던트 타임라인 (좌측 글로우 노드) |

---

## 3. 작업 항목 (Implementation Plan)

### 3.1 Phase 1 — 디자인 토큰 & 글로벌 스타일

**파일**: `src/app/globals.css`, `src/app/layout.tsx`

1. **CSS 변수 정의** (Tailwind v4 `@theme` 활용)
   - `--color-bg-0: #0a0512` / `--color-bg-1: #150a26` / `--color-bg-2: #1f0d33`
   - `--color-text` / `--color-text-muted` / `--color-text-dim`
   - `--color-accent` / `--color-accent-2` / `--color-cyan`
   - `--color-ok` / `--color-warn` / `--color-error`
   - `--glass-bg` / `--glass-bg-hi` / `--glass-border` / `--glass-border-hi`
2. **`body` 스타일**
   - 위 4단 라디얼 그라데이션 + 베이스 그라데이션 적용
   - `font-family`: Pretendard → Geist → system fallback
   - `min-height: 100vh`, `overflow-x: hidden`, `color-scheme: dark`
3. **글로벌 유틸 클래스**
   - `.mono` (JetBrains Mono)
   - `.glass-panel`, `.glass-panel-hi` (backdrop-filter + border + box-shadow)
   - `.scanlines` (fixed inset, repeating-linear-gradient, mix-blend-mode: overlay)
   - `.neon-glow-{ok|warn|error|cyan|accent}` (text-shadow + box-shadow 변형)
4. **스크롤바** 다크 톤(`::-webkit-scrollbar-thumb: rgba(255,255,255,.12)`)
5. **`prefers-reduced-motion`/`prefers-reduced-transparency` 처리**
   - reduced-motion → `@keyframes gGlitch` 비활성, scanlines 정적
   - reduced-transparency → `backdrop-filter` 제거 + 불투명 배경 폴백
6. **`layout.tsx` & 폰트 로딩**
   - `npm i pretendard` 후 `globals.css` 상단에 `@import 'pretendard/dist/web/static/pretendard.css';` (또는 variable: `pretendard/dist/web/variable/pretendardvariable.css`)
   - `next/font/google`로 `JetBrains_Mono` 추가하여 `--font-jetbrains-mono` 노출
   - Pretendard는 패키지 CSS가 자체적으로 `font-family: Pretendard` 선언을 등록 → `globals.css`의 `--font-pretendard` 변수에 `'Pretendard Variable', Pretendard, ...` 매핑
   - 폴백 폰트(`Geist`, `Geist_Mono`)는 `next/font/google`로 유지하여 Pretendard 로드 실패 시 graceful degrade
   - body에 다크 토큰 클래스 적용 (light 색상 클래스는 모두 제거)
   - 전역 `<ScanlinesOverlay />`를 `AppLayout`에서 렌더 (기본 on, reduced-motion 존중)

### 3.2 Phase 2 — 공통 컴포넌트

**신규 파일**: `src/components/ui/`

| 컴포넌트 | 역할 | 비고 |
|---|---|---|
| `GlassPanel.tsx` | `<div>` wrapper. `hi` prop으로 강조 강도 변경 | 모든 카드/섹션 baseline |
| `StatusPill.tsx` | OPERATIONAL / DEGRADED / INCIDENT 라벨 + 글로우 dot | `glitch` prop 옵션 |
| `Sparkline.tsx` | SVG polyline + gradient fill | 30~90개 값 입력 |
| `HeroPanel.tsx` | 헤드라인 + 4 KPI grid (`ONLINE/DEGRADED/DOWN/AVG ms`) | dashboard 전용 |
| `IncidentTimeline.tsx` | 좌측 라인 + 글로우 노드 + 카드 | 14d 인시던트 |
| `ScanlinesOverlay.tsx` | 전역 1회 마운트, fixed inset | 옵션 토글 가능 |
| `BackgroundOrbs.tsx` | hero 패널 우상단 데코 orb | optional |

> 기존 `StatusBadge.tsx`는 `StatusPill.tsx`로 흡수하거나 wrapper로 단순화. 호출부 확인: `ServiceCard.tsx` 사용 중.

### 3.3 Phase 3 — 페이지/컴포넌트 리스킨

#### 3.3.1 `src/components/Header.tsx`
- 흰색 → 다크 글래스 + 1px bottom border (`border-glass-border`)
- 로고: 38×38 conic-gradient(`accent → accent-2 → cyan → accent`) padded square + `A` glyph
- 사이트명: `advenoh.status` (그라데이션 텍스트), 부제 `net.online` (mono, dim, uppercase)
- Nav: Glass pill 컨테이너 + 활성 탭 = 그라데이션 배경 + `0 4px 16px ${accent}55`
- 우측: 전체 상태 `<StatusPill status={overall} glitch />` 노출
  - 데이터 소스: `useServices()` 훅의 services에서 derive (현재 Dashboard 내부 로직을 헤더로 끌어올리거나 별도 hook `useOverallStatus()` 도출)
- 로그인/유저 드롭다운: 다크 배경 + glass + cyan 호버

#### 3.3.2 `src/app/page.tsx` + `src/components/Dashboard.tsx`
- 페이지 컨테이너 `bg-gray-50` 제거 → 글로벌 dark gradient 사용
- `max-w-6xl` → `max-w-[1280px]` + horizontal padding `32px`
- 구성 순서:
  1. `<HeroPanel services overall />` — 메인 헤드라인 (`All systems online` / `Partial degradation` / `Active incident`) + 4 KPI
  2. ServiceCard 그리드 (`grid-cols-[repeat(auto-fill,minmax(300px,1fr))]`)
  3. `<UptimeHeatmap services summaryByDate days={90} />` (UptimeGrid 대체)
  4. `<IncidentTimeline incidents />` (옵션 — 데이터 모델 결정 후 활성)

#### 3.3.3 `src/components/ServiceCard.tsx`
- 흰 카드 → `<GlassPanel padding={22}>`
- 비-OK일 때 상단 2px 네온 그라데이션 라인 (`linear-gradient(90deg, transparent, ${color}, transparent)`) + glow
- Header row: 서비스명 + 도메인(mono, dim) + `<StatusPill />`
- (옵션) `<Sparkline values={trace30d} color={statusColor} />` — 응답시간 30일 trend
- 메트릭 3-col (mono): `LATENCY` (ms), `UPTIME 30D` (%), `SLA` (threshold ms)
- 호버: `border` 강조 (`var(--glass-border-hi)`)

#### 3.3.4 `src/components/UptimeGrid.tsx` → `UptimeHeatmap.tsx`로 확장
- 현재: 일자별 worst-status 단일 row
- 변경: **서비스별 row 분리**, 각 row = `[name 160px | days flex | uptime% 70px]`
- 셀: `flex:1, height:26, border-radius:2, box-shadow: 0 0 4px {c}88`
- 우측 30d uptime % 표시 (mono, 굵게)
- 헤더: `// UPTIME · 90 DAY` (cyan, mono) + 범례
- 데이터: `summaryByDate` 그대로 사용 (이미 service_id 별로 분리되어 있음)

#### 3.3.5 `src/components/MonthlyCalendar.tsx`
- 라이트 카드 → `<GlassPanel padding={18}>`
- 6개월 grid: `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`
- 셀: `aspectRatio: 1`, status 컬러 + glow (`box-shadow: 0 0 8px {c}88`)
- Today: `1.5px solid var(--color-cyan)` ring
- 미래일: `opacity: .35`
- 카드 헤더 우측에 월별 uptime % (cyan mono) 표시 (variant 코드 466~474줄 로직 참고)
- 텍스트 다크 → 라이트 컬러 + JetBrains Mono

#### 3.3.6 `src/app/history/page.tsx`
- `bg-gray-50` 제거, `max-w-[1280px]`
- 상단 카피
  - eyebrow: `// ARCHIVE · 6 MONTH` (cyan mono)
  - h1: `Uptime archive` (그라데이션 텍스트)
  - sub: `Daily aggregate health across all monitored services.`
- **상단 통계 패널 신규 추가** (`<GlassPanel>` 안 4 KPI: `OVERALL%`, `DAYS`, `DEGRADED`, `DOWN`)
  - variant 코드 520~574줄 참고
- 기존 `MonthlyCalendar` + `DayDetailPanel` 유지하되 다크 스타일 적용

#### 3.3.7 `src/app/admin/page.tsx` + `src/components/admin/ServiceList.tsx`
- eyebrow: `// CONFIG`, h1 그라데이션: `Service control`
- `Add Service` 버튼 → 그라데이션 + 네온 shadow (`linear-gradient(135deg, accent, accent-2)`)
- 테이블 → `<GlassPanel>`로 wrap, 행 사이 `border-top: 1px solid var(--glass-border)`
- Status dot 컬럼 추가 (현재 status 표시 안 됨 → `useServices` join 또는 추가 prop 필요)
- URL 컬럼 → `text-cyan font-mono`
- Edit/Delete 버튼 → glass 스타일 (`G_btnStyle()` 참고), Delete는 `error` 컬러 보더
- 모달(`ServiceFormModal`, `DeleteConfirmModal`, `LoginModal`): 다크 글래스 배경 + blur + 네온 강조 버튼

#### 3.3.8 `src/components/Footer.tsx`
- 다크 + `border-top: 1px solid var(--glass-border)`
- 좌측: `© 2026 advenoh.status · v∞` (mono, dim)
- 우측: `● online` (cyan), `powered by next.js · supabase`

### 3.4 Phase 4 — 데이터 보강

신규 디자인이 요구하는 데이터 중 현재 backend/hook에 없는 항목:

| 데이터 | 출처 / 구현 방식 |
|---|---|
| 서비스별 30일 응답시간 trace (Sparkline) | `service_status_logs.response_time`을 **일별 평균으로 집계 (raw 30 points)** — `useResponseTrace(serviceId, days)` hook 신설 |
| 서비스별 30일 uptime % | `summaryByDate`의 service별 `OK/total` 집계 — helper `calcUptime30d()` 신설 |
| 평균 응답시간 (Hero AVG ms) | `services` 배열의 `responseTime` 산술평균 (필드 미제공 시 `useServices`에 추가) |
| Incident 데이터 | **`service_status_logs`에서 비-OK(WARN/ERROR) 구간을 derive** — 같은 `service_id`의 연속된 비-OK 로그를 묶어 `started/resolved/duration_min` 산출, OK 로그가 들어오는 시점에 종료. `useIncidents(days=14)` hook 신설 |
| Service.lastChecked / responseTime / uptime30d | `useServices()`가 이미 일부 제공 — `responseTime`, `uptime30d` 미제공 시 hook 보강 (`ServiceWithStatus` 타입에 필드 추가) |

> 모든 데이터는 **첫 PR부터 실제 Supabase query로 연결**. mock 데이터(`buildResponseTrace`)는 사용하지 않음 — 디자인 검증 용도로만 참조.

### 3.5 Phase 5 — 반응형 & 접근성

- **Breakpoints**:
  - `< 768px`: Hero 2-col → 1-col stack, ServiceCard grid 1-col, History calendar 1-col, Header nav는 햄버거 또는 축약
  - `768~1280px`: ServiceCard 2-col, 캘린더 2-col
  - `>= 1280px`: 디자인 기준 그대로
- **접근성**
  - 모든 status 컬러는 WCAG AA 대비를 위해 텍스트는 `color: white` 또는 dark text on light pill 유지 — 현재 `StatusPill`은 어두운 배경 위 채도 높은 색이라 점검 필요
  - `<svg>` Sparkline에 `role="img"` + `aria-label`
  - `prefers-reduced-motion: reduce` → glitch 애니 + scanlines 오버레이 비활성 (결정 #6)
  - `prefers-reduced-transparency: reduce` 및 `@supports not (backdrop-filter: blur(1px))` → backdrop-filter 제거, opaque 폴백 (결정 #5)
- **포커스 링**: 다크 배경에 cyan 링 (`outline: 2px solid var(--color-cyan)`)

### 3.6 Phase 6 — QA 체크리스트

- [ ] Dashboard 헤로 + 카드 + heatmap이 1280px / 768px / 375px에서 깨지지 않음
- [ ] OK / WARN / ERROR 상태가 모두 시각적으로 구분됨 (색맹 시뮬레이션 포함)
- [ ] Glass 효과가 Safari/Chrome/Firefox에서 동작 (Firefox `backdrop-filter` 플래그 확인)
- [ ] Pretendard / JetBrains Mono 폰트 로드 (FOUT 최소화)
- [ ] Reduced motion / transparency 환경에서 폴백 동작
- [ ] Lighthouse Performance ≥ 90 (이미지/폰트 weight 점검)
- [ ] 다크 모드에서 OG image / favicon 일관성
- [ ] Login 모달 다크 스타일 적용 후 인증 플로우 정상

---

## 4. 변경 파일 매트릭스

| 파일 | Action | 비고 |
|---|---|---|
| `src/app/globals.css` | **확장** | 디자인 토큰, gradient bg, scanlines, glow, 폴백 |
| `src/app/layout.tsx` | 수정 | 폰트 추가, 다크 클래스 |
| `src/app/page.tsx` | 수정 | 컨테이너 다크화, Hero 추가 |
| `src/app/history/page.tsx` | 수정 | 다크화 + 통계 패널 추가 |
| `src/app/admin/page.tsx` | 수정 | 다크 헤딩, 그라데이션 버튼 |
| `src/components/AppLayout.tsx` | 수정 | (옵션) ScanlinesOverlay mount |
| `src/components/Header.tsx` | **재작성** | Glass nav + 로고 + StatusPill |
| `src/components/Dashboard.tsx` | **재작성** | Hero 사용 + ServiceCard grid |
| `src/components/ServiceCard.tsx` | **재작성** | Glass + Sparkline + 메트릭 |
| `src/components/StatusBadge.tsx` | 수정/제거 | StatusPill로 흡수 |
| `src/components/UptimeGrid.tsx` | **재작성 → UptimeHeatmap** | 서비스별 row 분리 |
| `src/components/MonthlyCalendar.tsx` | 수정 | Glass 카드 + cyan today ring |
| `src/components/DayDetailPanel.tsx` | 수정 | 다크 스타일 |
| `src/components/Footer.tsx` | 수정 | 다크 + cyan online |
| `src/components/LoginModal.tsx` | 수정 | Glass 모달 |
| `src/components/admin/ServiceList.tsx` | 수정 | Glass 테이블 + status dot |
| `src/components/admin/ServiceFormModal.tsx` | 수정 | 다크 모달 |
| `src/components/admin/DeleteConfirmModal.tsx` | 수정 | 다크 모달 |
| `src/components/admin/AdminSidebar.tsx` | 수정 | 다크 사이드바 |
| `src/components/ui/GlassPanel.tsx` | **신규** | 공통 wrapper |
| `src/components/ui/StatusPill.tsx` | **신규** | 글로우 pill |
| `src/components/ui/Sparkline.tsx` | **신규** | SVG sparkline |
| `src/components/ui/HeroPanel.tsx` | **신규** | KPI 4-up |
| `src/components/ui/IncidentTimeline.tsx` | **신규** | 14d timeline (M6에서 추가) |
| `src/components/ui/ScanlinesOverlay.tsx` | **신규** | fixed overlay |
| `src/hooks/useResponseTrace.ts` | **신규** | 서비스별 응답시간 시계열 (Supabase query) |
| `src/hooks/useIncidents.ts` | **신규** | `service_status_logs`에서 비-OK 구간 derive (14d) |
| `src/hooks/useOverallStatus.ts` | **신규 (옵션)** | header 전체 상태 |
| `src/lib/dateUtils.ts` | 보강 | uptime % 계산 헬퍼 |
| `src/types/index.ts` | 보강 | `Incident`, `ResponseTracePoint` 타입 |
| `package.json` | 의존성 추가 | `pretendard` (self-host CSS import) |

---

## 5. 결정 사항 (Resolved Decisions)

| # | 항목 | 결정 | 영향 |
|---|---|---|---|
| 1 | **Incidents 데이터 소스** | (a) `service_status_logs`에서 derive — DB 스키마 변경 없이 진행 | `useIncidents(days=14)` hook 신설. 같은 service_id의 비-OK(WARN/ERROR) 연속 구간을 묶어 `{started, resolved, duration_min, status, service}` 객체로 변환. 첫 OK 로그가 들어오는 시점을 resolved로 본다. 진행 중 인시던트는 `resolved=null`. |
| 2 | **Sparkline 데이터** | 실제 query — `service_status_logs.response_time`을 일별 평균으로 집계, 30 points | mock 미사용. `useResponseTrace(serviceId, days=30)` hook 신설. |
| 3 | **Light/Dark 토글** | **Dark only** — Light 모드 코드 경로 완전 제거 | 기존 `bg-gray-50`, `bg-white`, `text-gray-*` 등은 모두 다크 토큰으로 치환. 토글 UI / `prefers-color-scheme` 분기 없음. |
| 4 | **Pretendard 로딩 전략** | **(b) `npm i pretendard` self-host** | `pretendard` 패키지를 dependency로 추가, `globals.css`에서 `@import 'pretendard/dist/web/static/pretendard.css'` (또는 variable 버전 `pretendard-variable.css`) 로 불러옴. JetBrains Mono는 `next/font/google` 사용. CSS 변수 `--font-pretendard`, `--font-jetbrains-mono`로 노출하여 Tailwind/컴포넌트에서 참조. |
| 5 | **글래스 효과 폴백** | `backdrop-filter` 미지원 브라우저 → opaque(`rgba(20,10,38,.85)`)로 graceful degrade | `@supports not (backdrop-filter: blur(1px))` 블록으로 폴백 정의. |
| 6 | **Scanlines / Glitch 기본값** | 기본 on, `prefers-reduced-motion: reduce` 존중 | 사용자 토글 UI 없음. CSS `@media (prefers-reduced-motion: reduce)`로 애니/오버레이 비활성. |

---

## 6. 마일스톤 (제안)

7단계 PR로 분할하여 점진 머지 (M1: 토큰/글로벌 → M7: QA). 각 PR은 feature 브랜치(`feature/{issue}-redesign-{phase}`)에서 작업.

> 단계별 상세 작업 항목은 **`1_status_todo.md`** 참조.

---

## 7. 비범위 (Out of Scope)

- DB 스키마 변경(인시던트 테이블 신설)은 본 PRD가 결정 후 별도 PRD로 분리
- 알림(Telegram) 메시지 포맷 변경
- 신규 메트릭(p95 응답시간 등) 추가 — 기존 데이터로 표현 가능한 범위 내에서만 시각화
- 다국어(i18n) — 디자인 카피는 영문 그대로 유지

---

## 8. 참조 코드 — 빠른 매핑 가이드

| 디자인 요소 | `glass.jsx` 위치 | 대응 컴포넌트 |
|---|---|---|
| 컬러 팔레트 | 5–22행 (`G_COLORS`) | `globals.css` 변수 |
| Page background | 24–43행 (`glassStyles.page` + `scanlines`) | `globals.css` body |
| GlassPanel | 45–61행 | `ui/GlassPanel.tsx` |
| StatusPill | 63–94행 | `ui/StatusPill.tsx` |
| Header | 96–156행 | `Header.tsx` |
| HeroPanel | 160–226행 | `ui/HeroPanel.tsx` |
| Sparkline | 228–249행 | `ui/Sparkline.tsx` |
| ServiceCard | 251–312행 | `ServiceCard.tsx` |
| UptimeHeatmap | 314–381행 | `UptimeGrid.tsx` (재작성) |
| IncidentTimeline | 383–441행 | `ui/IncidentTimeline.tsx` |
| MonthCalendar | 445–510행 | `MonthlyCalendar.tsx` |
| HistoryPage 통계 | 512–584행 | `app/history/page.tsx` |
| AdminPage | 588–668행 | `app/admin/page.tsx` + `admin/ServiceList.tsx` |
| Footer | 681–698행 | `Footer.tsx` |
| Glitch keyframes | 710–715행 | `globals.css` |
