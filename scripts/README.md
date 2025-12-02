# Health Check Scripts

서비스 상태 체크 스크립트입니다. HTTP 엔드포인트를 확인하고 결과를 Supabase에 저장합니다.

## 요구사항

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (Python 패키지 매니저)

## 환경 변수 설정

`.zshrc` 또는 `.bashrc`에 다음 환경 변수를 설정합니다:

```bash
export ADVENOH_STATUS_SUPABASE_URL='your-supabase-url'
export ADVENOH_STATUS_SUPABASE_API_KEY='your-supabase-api-key'
export ADVENOH_STATUS_SLACK_WEBHOOK_URL='your-slack-webhook-url'  # 선택사항
```

설정 후 터미널을 재시작하거나 `source ~/.zshrc`를 실행합니다.

## 실행 방법

```bash
# scripts 폴더로 이동
cd scripts

# 의존성 설치
uv sync

# 스크립트 실행
uv run python health_check.py
```

## 스크립트 동작

1. Supabase `services` 테이블에서 모니터링 대상 서비스 목록을 조회
2. 각 서비스의 HTTP 엔드포인트에 요청을 보내 상태 확인
3. 상태 판정:
   - **OK**: HTTP 200 & 응답 시간 < threshold_ms
   - **WARN**: HTTP 200 & 응답 시간 > threshold_ms
   - **ERROR**: HTTP 4xx/5xx 또는 타임아웃
4. 이전 상태와 다를 경우에만 `service_status_logs` 테이블에 저장
5. WARN/ERROR 상태 변경 시 Slack 알림 발송 (설정된 경우)
