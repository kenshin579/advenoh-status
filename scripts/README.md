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
export ADVENOH_STATUS_TELEGRAM_BOT_TOKEN='your-telegram-bot-token'  # 선택사항
export ADVENOH_STATUS_TELEGRAM_CHAT_ID='your-telegram-chat-id'      # 선택사항
export ADVENOH_STATUS_SMTP_HOST='smtp.gmail.com'                     # 선택사항
export ADVENOH_STATUS_SMTP_PORT='587'                                # 선택사항
export ADVENOH_STATUS_SMTP_USER='your-gmail-address'                 # 선택사항
export ADVENOH_STATUS_SMTP_PASSWORD='your-gmail-app-password'        # 선택사항
export ADVENOH_STATUS_ALERT_EMAIL_TO='recipient@example.com'         # 선택사항, 쉼표 구분
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

# 단위 테스트
uv run pytest
```

## 스크립트 동작

1. Supabase `services` 테이블에서 모니터링 대상 서비스 목록을 조회
2. 각 서비스의 HTTP 엔드포인트에 요청을 보내 상태 확인
3. 상태 판정:
   - **OK**: HTTP 200 & 응답 시간 < threshold_ms
   - **WARN**: HTTP 200 & 응답 시간 > threshold_ms
   - **ERROR**: HTTP 4xx/5xx 또는 타임아웃
4. 매 체크마다 `service_status_logs` 테이블에 저장하고 `daily_status_summary`(KST 일별 집계)를 갱신
5. 알림 (Telegram + Email, 설정된 채널만):
   - ERROR 2회 연속 → 🔴 DOWN
   - DOWN 이후 ERROR 아님 → 🟢 RECOVERED (다운 지속 시간 포함)
   - WARN 은 알리지 않음. 발송·직전 상태 조회·DB 저장 실패 시 exit 1 (GitHub 실패 메일로 드러남)
