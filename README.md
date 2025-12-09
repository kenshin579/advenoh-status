# Advenoh Status

시스템 서버 모니터링 서비스 - GitHub Actions에서 서비스 상태를 체크하고, Supabase에 저장하며, Netlify에서 정적 웹사이트로 표시합니다.

## 아키텍처

```
GitHub Actions (매시간 Cron) → Supabase PostgreSQL → Netlify (정적 웹)
                                     ↓
                            Slack 알림 (상태 변경 시)
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, TypeScript |
| Database | Supabase PostgreSQL (RLS 적용) |
| Health Check | Python 3.12+, httpx, slack_sdk |
| Hosting | Netlify (ISR 지원) |
| CI/CD | GitHub Actions |

## 주요 기능

- **Dashboard**: 서비스 상태 실시간 모니터링, 90일 업타임 그리드
- **History**: 6개월 월별 캘린더 뷰
- **Slack 알림**: 상태 변경 시 자동 알림 (WARN/ERROR)
- **상태 판정**:
  - `OK`: HTTP 200 & 응답시간 < threshold (기본 3000ms)
  - `WARN`: HTTP 200 & 응답시간 > threshold
  - `ERROR`: HTTP 4xx/5xx 또는 타임아웃

## 프로젝트 구조

```
advenoh-status/
├── .github/workflows/
│   └── health-check.yml      # 매시간 헬스 체크 실행
├── scripts/
│   ├── health_check.py       # Python 헬스 체크 스크립트
│   └── pyproject.toml        # Python 의존성
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # 메인 대시보드
│   │   └── history/          # 업타임 히스토리
│   ├── components/           # React 컴포넌트
│   │   ├── Dashboard.tsx
│   │   ├── UptimeGrid.tsx    # 90일 그리드 (CSS Grid)
│   │   └── MonthlyCalendar.tsx
│   ├── hooks/
│   │   └── useServices.ts    # 데이터 조회 훅
│   └── lib/
│       ├── supabase.ts       # Supabase 클라이언트
│       └── dateUtils.ts      # 날짜 유틸리티
├── supabase/migrations/      # DB 스키마
└── netlify.toml              # Netlify 설정
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- Python 3.12+ (헬스 체크용)
- [uv](https://github.com/astral-sh/uv) (Python 패키지 관리)

### 설치

```bash
# Frontend 의존성 설치
npm install

# Python 의존성 설치
cd scripts
uv sync
```

### 환경 변수 설정

```bash
# .env.local (Frontend)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# GitHub Actions Secrets
ADVENOH_STATUS_SUPABASE_URL=your_supabase_url
ADVENOH_STATUS_SUPABASE_API_KEY=your_service_role_key
ADVENOH_STATUS_SLACK_BOT_TOKEN=xoxb-...  # 선택사항
ADVENOH_STATUS_SLACK_CHANNEL_ID=C...     # 선택사항
```

### 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

### 빌드

```bash
npm run build
```

### 헬스 체크 수동 실행

```bash
cd scripts
uv run python health_check.py
```

## 데이터베이스 스키마

```sql
-- services: 모니터링 대상 서비스
CREATE TABLE services (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  threshold_ms INT DEFAULT 3000
);

-- service_status_logs: 상태 로그
CREATE TABLE service_status_logs (
  id BIGSERIAL PRIMARY KEY,
  service_id UUID REFERENCES services(id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  status TEXT CHECK (status IN ('OK', 'WARN', 'ERROR')),
  response_time INT,
  http_status INT,
  message TEXT
);
```

## 스크립트

```bash
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm run lint      # ESLint 검사
npm run test      # Playwright 테스트
npm run test:ui   # Playwright UI 모드
```

## 배포

- **Frontend**: Netlify에 자동 배포 (main 브랜치 push 시)
- **Health Check**: GitHub Actions에서 매시간 자동 실행

## 라이선스

MIT
