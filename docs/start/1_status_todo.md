# Todo 체크리스트 — 시스템 서버 모니터링 서비스

## 1단계: 프로젝트 초기 설정

- [x] Next.js 16 (App Router) + TypeScript 프로젝트 생성
- [x] Tailwind CSS 설치 및 설정
- [x] 프로젝트 구조 생성 (src/app, src/components, src/lib, src/hooks, src/types)
- [x] .env.example 파일 생성
- [x] .gitignore 설정

---

## 2단계: Supabase 설정

- [ ] Supabase 프로젝트 생성
- [x] `services` 테이블 생성 (마이그레이션 파일)
- [x] `service_status_logs` 테이블 생성 (마이그레이션 파일)
- [x] `notification_channels` 테이블 생성 (마이그레이션 파일)
- [x] 인덱스 생성 (service_id, timestamp) (마이그레이션 파일)
- [x] RLS 정책 설정 (authenticated 사용자만 SELECT 허용) (마이그레이션 파일)
- [x] 초기 서비스 데이터 삽입 (마이그레이션 파일)
  - [x] Insquire Me
  - [x] ArgoCD
  - [x] Redis Insight
- [ ] 알림 채널 데이터 삽입 (Slack) - Supabase 콘솔에서 직접 추가
- [ ] Supabase Auth 설정 (Email 로그인 활성화) - Supabase 콘솔에서 설정

---

## 3단계: GitHub Actions 헬스체크 (Python + uv)

- [x] scripts 폴더 생성
- [x] pyproject.toml 작성
  - [x] httpx
  - [x] supabase
- [x] 헬스체크 스크립트 작성 (scripts/health_check.py)
  - [x] 서비스 목록 조회
  - [x] HTTP 요청 및 상태 판단 로직
  - [x] 이전 상태 조회
  - [x] 상태 변경 시에만 DB 저장
- [x] GitHub Actions 워크플로우 작성 (.github/workflows/health-check.yml)
  - [x] Python 3.12 설정
  - [x] uv 설치 (astral-sh/setup-uv@v4)
  - [x] uv sync로 의존성 설치
- [ ] GitHub Secrets 설정 - GitHub 저장소 Settings에서 직접 설정
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_SERVICE_KEY
  - [ ] SLACK_WEBHOOK_URL
- [ ] 워크플로우 수동 실행 테스트

---

## 4단계: 알림 시스템 구현 (Python)

- [ ] Slack Webhook 설정 - Slack App에서 Incoming Webhook 생성 후 GitHub Secrets에 추가
- [x] Slack 알림 함수 구현 (send_slack_notification)
- [x] 상태 변경 시에만 알림 발송 로직
- [ ] 알림 발송 테스트

---

## 5단계: 프론트엔드 - 공통 컴포넌트

- [x] Supabase 클라이언트 설정 (src/lib/supabase.ts)
- [x] 타입 정의 (src/types/index.ts)
- [x] StatusBadge 컴포넌트 (OK/WARN/ERROR 색상 표시)
- [x] useAuth 훅 구현
- [x] useServices 훅 구현
- [x] ProtectedRoute 컴포넌트 (미들웨어로 구현)

---

## 6단계: 프론트엔드 - 인증

- [x] 로그인 페이지 구현 (src/app/login/page.tsx)
- [x] Supabase Auth 연동
- [x] 로그인/로그아웃 기능
- [x] 인증 상태 관리
- [x] Next.js 미들웨어로 인증 체크

---

## 7단계: 프론트엔드 - 메인 대시보드

- [x] 루트 레이아웃 구현 (src/app/layout.tsx)
- [x] 메인 페이지 구현 (src/app/page.tsx)
- [x] Dashboard 컴포넌트 구현
  - [x] 전체 시스템 상태 표시 (All Systems Operational 등)
  - [x] 상태에 따른 색상 표시
- [x] ServiceCard 컴포넌트 구현
  - [x] 서비스명 표시
  - [x] 현재 상태 표시 (색상)
- [x] UptimeGrid 컴포넌트 구현 (90일 가용률 격자)
  - [x] 일별 색상 블록 (CSS Grid)
  - [x] 호버 시 툴팁 표시
  - [x] 범례 표시 (OK/WARN/ERROR)
- [x] 클라이언트 사이드 렌더링으로 구현

---

## 8단계: 프론트엔드 - History 페이지

- [x] History 페이지 구현 (src/app/history/page.tsx)
- [x] MonthlyCalendar 컴포넌트 구현
  - [x] 월별 달력 레이아웃 (CSS Grid 7열)
  - [x] 일별 색상 블록 표시
  - [x] 호버 시 툴팁 표시
  - [x] 최근 6개월 표시
- [ ] 서비스별 필터링 기능 (선택) - 향후 구현

---

## 9단계: 레이아웃 및 네비게이션

- [x] 헤더 컴포넌트
- [x] 네비게이션 컴포넌트 (/ ↔ /history)
- [x] 404 페이지 (src/app/not-found.tsx)
- [x] 라우트 구성 확인
  - [x] / → 대시보드
  - [x] /history → History 페이지
  - [x] /login → 로그인

---

## 10단계: Netlify 배포

- [x] netlify.toml 설정
- [x] @netlify/plugin-nextjs 플러그인 설정
- [ ] Netlify 프로젝트 연결 - Netlify 콘솔에서 설정
- [ ] 환경 변수 설정 - Netlify 콘솔에서 설정
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] 배포 테스트

---

## 11단계: 테스트 (Playwright)

- [x] 로그인 페이지 테스트
  - [x] 로그인 폼 표시 확인
  - [x] 필수 입력 필드 검증
- [x] 인증되지 않은 사용자 리다이렉트 테스트
  - [x] / → /login 리다이렉트
  - [x] /history → /login 리다이렉트
- [x] 404 페이지 테스트

---

## 12단계: 최종 검증

- [ ] GitHub Actions 5분 간격 실행 확인
- [ ] 상태 변경 시에만 DB 저장 확인
- [ ] 장애 시뮬레이션 및 알림 수신 확인
- [ ] 웹사이트 정상 동작 확인
- [ ] RLS 정책 동작 확인 (비인증 사용자 접근 차단)
