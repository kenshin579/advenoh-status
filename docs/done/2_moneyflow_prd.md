# MoneyFlow 서비스 Health Check 추가 PRD

## 1. 개요

MoneyFlow 서비스를 기존 모니터링 시스템에 추가하여 서비스 상태를 실시간으로 모니터링한다.

## 2. 대상 서비스

| 서비스명 | URL | 설명 |
|---------|-----|------|
| MoneyFlow | https://moneyflow.advenoh.pe.kr | 메인 웹 애플리케이션 |
| MoneyFlow API | https://moneyflow.advenoh.pe.kr/health | Backend API Health Check |

## 3. 요구사항

### 3.1 서비스 등록

Supabase `services` 테이블에 다음 서비스를 추가한다:

```sql
INSERT INTO services (name, url, threshold_ms) VALUES
  ('MoneyFlow', 'https://moneyflow.advenoh.pe.kr', 3000),
  ('MoneyFlow API', 'https://moneyflow.advenoh.pe.kr/health', 3000);
```

### 3.2 모니터링 기준

| 항목 | 기준값 |
|------|--------|
| 응답 지연 임계값 | 3000ms (기본값) |
| 타임아웃 | 10초 |
| 체크 주기 | 5분 (기존 GitHub Actions 스케줄) |

### 3.3 상태 판단 기준

- **OK**: HTTP 200 & 응답시간 < 3000ms
- **WARN**: HTTP 200 & 응답시간 >= 3000ms
- **ERROR**: 4xx/5xx 응답 또는 타임아웃

### 3.4 알림

- 상태 변경 시 (WARN/ERROR) Slack 알림 발송
- 기존 알림 채널 사용

## 4. 작업 목록

### 4.1 데이터베이스 작업

- [ ] Supabase에 MoneyFlow 서비스 레코드 추가
- [ ] Supabase에 MoneyFlow API 서비스 레코드 추가

### 4.2 검증 작업

- [ ] health_check.py 로컬 실행으로 연결 테스트
- [ ] GitHub Actions 실행 후 정상 동작 확인
- [ ] 대시보드에서 서비스 표시 확인

## 5. 변경 범위

### 영향 없음 (코드 변경 불필요)

- `scripts/health_check.py` - 기존 로직 그대로 사용
- `.github/workflows/health-check.yml` - 변경 불필요
- Frontend 컴포넌트 - 자동으로 새 서비스 표시

### 필요 작업

- Supabase `services` 테이블에 데이터 INSERT만 수행

## 6. 비고

- Backend `/health` 엔드포인트가 제공되므로 별도의 Health Check 로직 구현 불필요
- 기존 모니터링 인프라를 그대로 활용하여 추가 유지보수 비용 없음
