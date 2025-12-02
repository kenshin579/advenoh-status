# 📄 최종 PRD — 시스템 서버 모니터링 서비스

## 1. 프로젝트 개요

본 프로젝트는 사용자가 운영 중인 다양한 서비스의 상태를 외부 환경에서 모니터링하고, 장애 또는 이상 징후가 발생하면 즉시 알림을 제공하기 위한 경량 모니터링 시스템을 구축하는 것을 목표로 한다.

모니터링 로직은 GitHub Actions에서 수행되며, 결과는 Supabase DB에 저장된다. 웹사이트는 Netlify로 정적 배포하며, 시스템의 현재 상태와 이력을 시각적으로 확인할 수 있다.

본 시스템은 **"유지보수 최소화"**를 최우선 목표로 설계되었다.

---

## 2. 목표

- 운영 중인 모든 서비스의 실시간 상태 모니터링
- 과거 날짜의 상태 이력 확인 기능 제공 (월별 달력 형태)
- 장애 발생 시 Slack 자동 알림
- 모니터링 실행은 외부 환경(GitHub Actions)에서 수행
- 모든 구성 요소는 최소한의 유지보수로 안정 운영 가능해야 함

---

## 3. 모니터링 대상 서비스

- https://inspire-me.advenoh.pe.kr
- https://argocd.advenoh.pe.kr
- https://redisinsight.advenoh.pe.kr

각 서비스는 다음 항목을 기준으로 모니터링한다:

- HTTP 응답 코드
- 응답 지연 시간(ms)
- 응답 불가 여부

---

## 4. 주요 기능 요구사항

### 4.1 서비스 상태 체크 (GitHub Actions에서 수행)

#### 기능

- 모니터링 작업은 GitHub Actions에서 5분마다 실행
- 각 서비스 URL에 대해 HTTP 요청 수행
- 상태 판단 기준:
  - **OK**: 응답 코드 200 & 정상속도
  - **WARN**: 응답 코드 200이나 응답시간 임계값 초과
  - **ERROR**: 4xx/5xx 또는 timeout
- **상태가 변경될 때만** Supabase DB에 저장 (중복 데이터 방지)

#### 실패 처리

- GitHub Action은 실패하더라도 모니터링 스케줄은 유지
- Exception 발생 시 ERROR 상태로 기록 후 알림 전송

---

### 4.2 알림 시스템

#### 알림 트리거

- 상태가 WARN 또는 ERROR일 경우
- "이전 상태와 비교해 변화가 있을 때만" 알림 발송 → 알람 폭주 방지

#### 알림 방식

- Slack Webhook

#### 알림 내용

- 서비스명
- 발생한 상태(WARN/ERROR)
- 응답 코드 & 응답 시간
- timestamp
- 상세 오류 메시지(있을 경우)

---

### 4.3 웹 모니터링 페이지 (Netlify Static Web Site)

정적 웹사이트로 제작하여 유지보수를 최소화하며, 모든 데이터는 Supabase에서 직접 조회한다.

#### 4.3.1 메인 대시보드 (/)

- 전체 시스템 상태 표시 (All Systems Operational / Partial Outage / Major Outage)
- 각 서비스의 현재 상태 표시
  - 서비스명
  - 현재 상태 (OK/WARN/ERROR)
  - 상태 색상 표시 (녹/황/적)
- 90일 가용률 격자 그래프
  - 일별 색상 블록으로 표시
  - 호버 시 해당 날짜 상태 툴팁

#### 4.3.2 History 페이지 (/history)

- 월별 달력 형태의 상태 이력 표시
  - 일별 색상 블록 (녹/황/적)
  - 호버 시 상세 정보 툴팁
- 서비스별 필터링 기능
- 최근 90일 ~ 1년 이력 조회

#### 4.3.3 인증

- Supabase Auth 사용(Email Login)
- 로그인 사용자만 모니터링 페이지 접근 허용

---

## 5. 아키텍처

```
            ┌───────────────────────────┐
            │        GitHub Actions      │
            │  - 서비스 헬스 체크         │
            │  - Supabase DB Insert      │
            │  - Slack 알림              │
            └───────────┬───────────────┘
                        │ REST API
                        ▼
              ┌────────────────────────┐
              │      Supabase DB       │
              │ service_status_logs    │
              │ services               │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │  Static Web (Netlify)  │
              │  - Next.js (App Router)│
              │  - Supabase Client     │
              └────────────────────────┘
```

- **GitHub Actions** → 데이터 수집 & 알림
- **Supabase DB** → 상태 로그 저장
- **Netlify Static Web** → UI 표시

---

## 6. 데이터베이스 스키마

### Table: services

| 필드 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| name | text | 서비스 이름 |
| url | text | 서비스 URL |
| threshold_ms | int | 응답지연 기준 (기본값 3000ms) |
| created_at | timestamptz | 등록일 |

---

### Table: service_status_logs

| 필드 | 타입 | 설명 |
|------|------|------|
| id | bigint (PK) | 로그 ID |
| service_id | uuid (FK) | services.id |
| timestamp | timestamptz | 상태 변경 시간 |
| status | text | OK/WARN/ERROR |
| response_time | int | 응답 시간(ms) |
| http_status | int | HTTP 상태 코드 |
| message | text | 오류 메시지 |

> **참고**: 상태가 변경될 때만 저장하여 데이터 중복을 방지

---

### Table: notification_channels

| 필드 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| type | text | slack |
| target | text | webhook URL |

---

## 7. 웹사이트 기술 구성

- **Static Web (Netlify)**
- 프레임워크: Next.js 16 (App Router)
- 스타일링: Tailwind CSS
- Build 결과물 Netlify에 배포
- Supabase anon key 사용하여 데이터 읽기 구현

---

## 8. 보안 설계

- **GitHub Action** → service_role key 사용
- **Static Web** → anon public key만 사용
- **Supabase RLS**:
  - authenticated 사용자는 상태 로그 SELECT 가능
  - public 접근은 비활성화
- **CORS**: Netlify 도메인만 허용

---

## 9. 운영 정책

### 9.1 모니터링 스케줄

- 5분 간격 GitHub Action

### 9.2 로그 보관 정책

- 기본 90일 보관 (필요 시 확장 가능)
- 오래된 로그는 Supabase 정책으로 자동 삭제(옵션)

---

## 10. 개발 계획 및 일정(예시)

| 단계 | 내용 |
|------|------|
| 1단계 | DB 설계 및 Supabase 구성 |
| 2단계 | GitHub Action 헬스체크 스크립트 (Python) |
| 3단계 | Slack 알림 구축 |
| 4단계 | Static Web UI (메인 대시보드) |
| 5단계 | History 페이지 구현 |
| 6단계 | Netlify 배포 + 최종 테스트 |
