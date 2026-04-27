# Advenoh Status — Glass + Cyberpunk 리디자인 Todo

> **참조**: `1_status_prd.md`, `1_status_implementation.md`
> 각 마일스톤(M1~M7)은 1 PR로 분리. 브랜치명: `feature/redesign-{phase}`

---

## M1. 디자인 토큰 & 글로벌 스타일 & 공통 컴포넌트 기본

### 의존성
- [x] `npm i pretendard` 설치
- [x] `package.json`에 dependency 등재 확인

### globals.css
- [x] `@import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'` 추가 (variable + dynamic subset)
- [x] `@theme` 블록에 색상 변수 정의 (bg, text, accent, status)
- [x] `--color-glass-*` 변수 정의 (bg, bg-hi, border, border-hi)
- [x] `--font-sans`, `--font-mono` 변수 정의 (Pretendard Variable + JetBrains Mono)
- [x] body 라디얼 그라데이션 + 베이스 그라데이션 적용
- [x] 다크 스크롤바 스타일
- [x] `.mono`, `.glass-panel`, `.glass-panel-hi`, `.scanlines` 유틸 추가
- [x] `@keyframes gGlitch` 정의
- [x] `@supports not (backdrop-filter)` 폴백 블록
- [x] `@media (prefers-reduced-motion: reduce)` 블록
- [x] `@media (prefers-reduced-transparency: reduce)` 블록

### layout.tsx
- [x] `Geist`, `Geist_Mono` 외 `JetBrains_Mono` 추가 (next/font/google)
- [x] body className에 mono variable 추가
- [ ] light 색상 클래스 모두 제거 확인 (M2 이후 페이지/컴포넌트 리스킨 시 함께)

### 공통 UI 컴포넌트 신규
- [x] `src/components/ui/GlassPanel.tsx` 작성
- [x] `src/components/ui/StatusPill.tsx` 작성 (glitch 옵션 포함)
- [x] `src/components/ui/ScanlinesOverlay.tsx` 작성
- [x] `src/components/AppLayout.tsx`에 `<ScanlinesOverlay />` 마운트

### 검증
- [x] `npm run build` Compiled successfully (TypeScript 통과). prerender는 Supabase env 부재로 실패 — 사전 환경 셋업 이슈, M1 변경과 무관
- [ ] 브라우저에서 Pretendard 폰트 로드 확인 (M2 PR 검토 시 dev 서버에서 확인)

---

## M2. Header + Footer

### Header.tsx (재작성)
- [x] 흰 배경 제거, glass 배경 + bottom border
- [x] 로고 38×38 conic-gradient + `A` 글리프 구현
- [x] 사이트명 그라데이션 텍스트 + 부제 `net.online` (mono dim)
- [x] Nav glass pill 컨테이너 + 활성 탭 그라데이션 배경
- [x] 우측 `<StatusPill status={overall} glitch />` 추가
- [x] `useOverallStatus()` hook 구현 또는 props로 전달
- [x] 로그인 버튼 / 유저 드롭다운 다크 스타일 + cyan 호버
- [x] Suspense fallback도 다크 스타일로 갱신

### Footer.tsx
- [x] `border-t` glass border + mono dim
- [x] 좌측 `© ${year} advenoh.status · v∞`
- [x] 우측 `● online` (cyan) + 기술 스택 텍스트

### 검증
- [x] TypeScript 타입 체크 통과
- [ ] MCP Playwright: Header 네비게이션 동작, Login 모달 오픈 확인 (M7 통합 검증에서)
- [ ] MCP Playwright: 모바일(375px) 뷰포트에서 Header 깨짐 없음 (M7)
- [ ] reduced-motion 환경에서 glitch 비활성 확인 (M7)

---

## M3. Dashboard (Hero + ServiceCard + Sparkline + UptimeHeatmap)

### 신규 컴포넌트
- [x] `src/components/ui/Sparkline.tsx` 작성 (SVG + gradient fill, role="img")
- [x] `src/components/ui/HeroPanel.tsx` 작성 (eyebrow + 헤드라인 + 4 KPI + 데코 orb)

### Hook 보강
- [x] `src/hooks/useResponseTrace.ts` 신규 (Supabase query, 일별 평균)
- [x] `src/hooks/useServices.ts`에 `responseTime` 필드 추가 (uptime30d는 page에서 enrich)
- [x] `src/lib/dateUtils.ts`에 `calcUptime30d()` 추가
- [x] `src/types/index.ts`에 `ResponseTracePoint`, `Incident` 타입 추가

### Dashboard.tsx (재작성)
- [x] 단색 배너 → `<HeroPanel />` 사용
- [x] overall 상태 산출 로직 헤더와 공유 (deriveOverall + useOverallStatus)

### ServiceCard.tsx (재작성)
- [x] `<GlassPanel>` 사용
- [x] 비-OK 시 상단 2px 네온 그라데이션 라인 + glow
- [x] Header row: 서비스명 + 도메인(mono dim) + StatusPill
- [x] `<Sparkline />` 통합 (showSparkline prop)
- [x] 메트릭 3-col: LATENCY / UPTIME 30D / SLA (mono)

### UptimeGrid.tsx → UptimeHeatmap
- [x] 컴포넌트 이름 변경 (default export `UptimeHeatmap`, 파일명 유지) + props에 `services` 추가
- [x] 헤더 `// UPTIME · 90 DAY` + 범례
- [x] 서비스별 row 분리: `grid-cols-[160px_1fr_70px]`
- [x] 셀 글로우
- [x] 우측 30d uptime % 표시
- [x] hover tooltip (title 속성)

### page.tsx
- [x] `bg-gray-50` 제거, `max-w-[1280px]`로 변경
- [x] HeroPanel → ServiceCard grid → UptimeHeatmap 순서
- [x] StatusBadge 사용처 StatusPill로 교체
- [x] StatusBadge.tsx 파일 삭제

### 검증
- [x] TypeScript 타입 체크 통과
- [ ] MCP Playwright: Dashboard 모든 섹션 렌더 확인 (M7)
- [ ] MCP Playwright: ServiceCard hover/Sparkline/UptimeHeatmap 검증 (M7)
- [ ] MCP Playwright: 1280 / 1024 / 768 / 375 뷰포트 스크린샷 비교 (M7)

---

## M4. History 페이지

### MonthlyCalendar.tsx
- [x] 라이트 카드 → `<GlassPanel>`
- [x] 6개월 grid `auto-fill minmax(280px, 1fr)`
- [x] 카드 헤더: 월 이름 + 우측 월별 uptime % (cyan mono)
- [x] 셀 status 컬러 + glow + today cyan ring + 미래일 opacity (selected는 magenta accent ring)
- [x] 텍스트 색상 다크 → 라이트 + 셀 텍스트는 dark on light pill
- [x] selectedDate / onDateClick 동작 유지

### DayDetailPanel.tsx
- [x] `<GlassPanel>` 적용
- [x] 텍스트 색상 다크 → 라이트
- [x] 상태 컬러 네온 적용 (StatusPill 사용)

### history/page.tsx
- [x] `bg-gray-50` 제거, `max-w-[1280px]`
- [x] eyebrow `// ARCHIVE · 6 MONTH` (cyan mono)
- [x] h1 `Uptime archive` 그라데이션 텍스트
- [x] 통계 패널 신규 (`<GlassPanel>` 안 4 KPI: OVERALL% / DAYS / DEGRADED / DOWN)
- [x] 통계 산출 로직 (variant glass.jsx 520~530줄 참고)

### 검증
- [x] TypeScript 타입 체크 통과
- [ ] MCP Playwright: History 페이지 로드, 통계 패널 + 6개월 캘린더 + DayDetailPanel 모두 표시 (M7)
- [ ] MCP Playwright: 날짜 클릭 → DayDetailPanel 갱신 (M7)
- [ ] MCP Playwright: today 셀에 cyan ring 적용 확인 (M7)

---

## M5. Admin 페이지 + 모달

### admin/ServiceList.tsx
- [x] 흰 테이블 → `<GlassPanel>` wrap
- [x] 컬럼 헤더 mono uppercase + dim 컬러
- [x] status dot 컬럼 추가 (서비스의 currentStatus 기반, prop으로 확장 가능)
- [x] URL 컬럼 cyan + mono
- [x] Edit / Delete 버튼 glass 보더 (Delete는 error 컬러)
- [x] 행 사이 glass border

### admin/ServiceFormModal.tsx
- [x] 다크 글래스 모달 + blur 백드롭
- [x] input 다크 스타일 (배경 / 보더 / focus cyan)
- [x] 제출 버튼 그라데이션 + 네온 shadow

### admin/DeleteConfirmModal.tsx
- [x] 다크 글래스 모달
- [x] Confirm 버튼 error 컬러 강조

### admin/AdminSidebar.tsx
- [x] 다크 사이드바 + glass border
- [x] 활성 메뉴 그라데이션(accent) 강조 + neon shadow

### admin/page.tsx
- [x] eyebrow `// CONFIG`
- [x] h1 `Service control` 그라데이션
- [x] `+ Add Service` 버튼 그라데이션 + 네온 shadow
- [x] 에러 메시지 박스 다크 스타일

### LoginModal.tsx
- [x] 다크 글래스 모달
- [x] input 다크 스타일 (focus cyan)
- [x] 에러 메시지 다크 + error 컬러

### 검증
- [x] TypeScript 타입 체크 통과
- [ ] MCP Playwright: `?enable_login=true`로 로그인 모달 오픈 + 다크 스타일 확인 (M7)
- [ ] MCP Playwright: 로그인 → admin 진입 → ServiceList 표시 (M7)
- [ ] MCP Playwright: Add / Edit / Delete 모달 각각 오픈/제출 시나리오 (M7)
- [ ] 키보드 Tab 포커스 링 cyan 확인 (M7)

---

## M6. IncidentTimeline + 데이터 연결

### Hook
- [ ] `src/hooks/useIncidents.ts` 신규
  - [ ] Supabase query (14일 service_status_logs)
  - [ ] 같은 service_id의 비-OK 연속 구간 → Incident 객체로 변환
  - [ ] 진행 중 인시던트 (`resolved=null`) 처리
- [ ] `src/types/index.ts`에 `Incident` 타입 추가

### 컴포넌트
- [ ] `src/components/ui/IncidentTimeline.tsx` 작성
  - [ ] 좌측 24px 인덴트 + 라인 + 글로우 노드
  - [ ] 각 항목: title + status pill + service + duration + 타임스탬프 (mono)
  - [ ] 빈 상태 처리 ("No incidents in last 14 days")

### Dashboard 통합
- [ ] `app/page.tsx` 또는 `Dashboard.tsx`에서 `useIncidents()` 호출
- [ ] `<IncidentTimeline incidents={incidents} />` 렌더 (UptimeHeatmap 하단)

### 검증
- [ ] MCP Playwright: 인시던트가 있는 환경에서 타임라인 렌더 확인
- [ ] MCP Playwright: 인시던트가 없는 환경에서 빈 상태 메시지 확인
- [ ] DB에 임의 WARN/ERROR 로그 삽입 → derive 결과 정합성 확인

---

## M7. 반응형 & 접근성 & QA

### 반응형
- [ ] Hero 모바일 1-col stack (`< sm`)
- [ ] ServiceCard grid 모바일 1-col, 태블릿 2-col
- [ ] UptimeHeatmap 모바일에서 셀 width 축소 또는 가로 스크롤
- [ ] History 캘린더 모바일 1-col
- [ ] Header nav 모바일에서 텍스트 축약 또는 햄버거

### 접근성
- [ ] Status 컬러 WCAG AA 대비 점검 (axe DevTools)
- [ ] Sparkline `role="img"` + `aria-label` 확인
- [ ] 포커스 링 cyan + outline-offset 적용 확인
- [ ] 키보드만으로 Header → Nav → 카드 → Admin 흐름 점검
- [ ] reduced-motion 환경에서 glitch / scanlines 비활성 확인
- [ ] reduced-transparency 환경에서 opaque 폴백 확인

### 성능
- [ ] Lighthouse Performance ≥ 90
- [ ] Pretendard FOUT 점검 (font-display: swap)
- [ ] OG image / favicon 다크 톤 일관성

### 회귀 테스트
- [ ] MCP Playwright: 전체 페이지(Dashboard / History / Admin) 스크린샷 회귀
- [ ] MCP Playwright: 1280 / 1024 / 768 / 375 뷰포트 각각 검증
- [ ] MCP Playwright: 다크 모드 강제 + reduced-motion 강제 시나리오
- [ ] MCP Playwright: Login 플로우 정상 동작
- [ ] MCP Playwright: Admin CRUD (Add / Edit / Delete) 플로우 정상

### 마무리
- [ ] 사용하지 않는 light 모드 코드/클래스 제거 확인
- [ ] `StatusBadge.tsx` 등 deprecated 파일 정리
- [ ] CHANGELOG/PR description 작성
