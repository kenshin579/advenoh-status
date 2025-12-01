# Todo 체크리스트 — 시스템 서버 모니터링 서비스

## 1단계: 프로젝트 초기 설정

- [ ] Next.js 16 (App Router) + TypeScript 프로젝트 생성
- [ ] Tailwind CSS 설치 및 설정
- [ ] 프로젝트 구조 생성 (src/app, src/components, src/lib, src/hooks, src/types)
- [ ] .env.example 파일 생성
- [ ] .gitignore 설정

---

## 2단계: Supabase 설정

- [ ] Supabase 프로젝트 생성
- [ ] `services` 테이블 생성
- [ ] `service_status_logs` 테이블 생성
- [ ] `notification_channels` 테이블 생성
- [ ] 인덱스 생성 (service_id, timestamp)
- [ ] RLS 정책 설정 (authenticated 사용자만 SELECT 허용)
- [ ] 초기 서비스 데이터 삽입
  - [ ] Insquire Me
  - [ ] ArgoCD
  - [ ] Redis Insight
- [ ] 알림 채널 데이터 삽입 (Slack)
- [ ] Supabase Auth 설정 (Email 로그인 활성화)

---

## 3단계: GitHub Actions 헬스체크 (Python + uv)

- [ ] scripts 폴더 생성
- [ ] pyproject.toml 작성
  - [ ] httpx
  - [ ] supabase
- [ ] 헬스체크 스크립트 작성 (scripts/health_check.py)
  - [ ] 서비스 목록 조회
  - [ ] HTTP 요청 및 상태 판단 로직
  - [ ] 이전 상태 조회
  - [ ] 상태 변경 시에만 DB 저장
- [ ] GitHub Actions 워크플로우 작성 (.github/workflows/health-check.yml)
  - [ ] Python 3.12 설정
  - [ ] uv 설치 (astral-sh/setup-uv@v4)
  - [ ] uv sync로 의존성 설치
- [ ] GitHub Secrets 설정
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_SERVICE_KEY
  - [ ] SLACK_WEBHOOK_URL
- [ ] 워크플로우 수동 실행 테스트

---

## 4단계: 알림 시스템 구현 (Python)

- [ ] Slack Webhook 설정
- [ ] Slack 알림 함수 구현 (send_slack_notification)
- [ ] 상태 변경 시에만 알림 발송 로직
- [ ] 알림 발송 테스트

---

## 5단계: 프론트엔드 - 공통 컴포넌트

- [ ] Supabase 클라이언트 설정 (src/lib/supabase.ts)
- [ ] 타입 정의 (src/types/index.ts)
- [ ] StatusBadge 컴포넌트 (OK/WARN/ERROR 색상 표시)
- [ ] useAuth 훅 구현
- [ ] useServices 훅 구현
- [ ] ProtectedRoute 컴포넌트 (미들웨어 또는 클라이언트)

---

## 6단계: 프론트엔드 - 인증

- [ ] 로그인 페이지 구현 (src/app/login/page.tsx)
- [ ] Supabase Auth 연동
- [ ] 로그인/로그아웃 기능
- [ ] 인증 상태 관리
- [ ] Next.js 미들웨어로 인증 체크 (선택)

---

## 7단계: 프론트엔드 - 메인 대시보드

- [ ] 루트 레이아웃 구현 (src/app/layout.tsx)
- [ ] 메인 페이지 구현 (src/app/page.tsx)
- [ ] Dashboard 컴포넌트 구현
  - [ ] 전체 시스템 상태 표시 (All Systems Operational 등)
  - [ ] 상태에 따른 색상 표시
- [ ] ServiceCard 컴포넌트 구현
  - [ ] 서비스명 표시
  - [ ] 현재 상태 표시 (색상)
- [ ] UptimeGrid 컴포넌트 구현 (90일 가용률 격자)
  - [ ] 일별 색상 블록 (CSS Grid)
  - [ ] 호버 시 툴팁 표시
  - [ ] 범례 표시 (OK/WARN/ERROR)
- [ ] ISR 설정 (revalidate)

---

## 8단계: 프론트엔드 - History 페이지

- [ ] History 페이지 구현 (src/app/history/page.tsx)
- [ ] MonthlyCalendar 컴포넌트 구현
  - [ ] 월별 달력 레이아웃 (CSS Grid 7열)
  - [ ] 일별 색상 블록 표시
  - [ ] 호버 시 툴팁 표시
  - [ ] 최근 6개월 ~ 1년 표시
- [ ] 서비스별 필터링 기능 (선택)

---

## 9단계: 레이아웃 및 네비게이션

- [ ] 헤더 컴포넌트
- [ ] 네비게이션 컴포넌트 (/ ↔ /history)
- [ ] 404 페이지 (src/app/not-found.tsx)
- [ ] 라우트 구성 확인
  - [ ] / → 대시보드
  - [ ] /history → History 페이지
  - [ ] /login → 로그인

---

## 10단계: Netlify 배포

- [ ] netlify.toml 설정
- [ ] @netlify/plugin-nextjs 플러그인 추가
- [ ] Netlify 프로젝트 연결
- [ ] 환경 변수 설정
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] 배포 테스트

---

## 11단계: 테스트 (MCP Playwright 사용)

- [ ] 로그인 페이지 테스트
- [ ] 대시보드 로딩 테스트
- [ ] 서비스 상태 색상 표시 테스트
- [ ] 90일 가용률 격자 렌더링 테스트
- [ ] History 페이지 달력 렌더링 테스트
- [ ] 인증되지 않은 사용자 리다이렉트 테스트

---

## 12단계: 최종 검증

- [ ] GitHub Actions 5분 간격 실행 확인
- [ ] 상태 변경 시에만 DB 저장 확인
- [ ] 장애 시뮬레이션 및 알림 수신 확인
- [ ] 웹사이트 정상 동작 확인
- [ ] RLS 정책 동작 확인 (비인증 사용자 접근 차단)
