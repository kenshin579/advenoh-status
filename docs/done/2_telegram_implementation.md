# Slack → Telegram 알림 전환 구현 문서

## 1. 개요

현재 `slack_sdk.WebClient` 기반 Slack 알림을 Telegram Bot API (`httpx`) 기반으로 전환합니다. 추가 라이브러리 없이 기존 `httpx`를 재활용합니다.

---

## 2. 구현 범위

### 2.1 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `scripts/health_check.py` | Slack 코드 제거, Telegram 알림 함수 구현 |
| `scripts/pyproject.toml` | `slack_sdk` 의존성 제거 |
| `.github/workflows/health-check.yml` | 환경변수 Slack → Telegram 교체 |
| `CLAUDE.md` | 환경변수 문서 업데이트 |
| `README.md` | 아키텍처 설명 Slack → Telegram 변경 |

### 2.2 환경변수 변경

| 제거 (Slack) | 추가 (Telegram) |
|-------------|----------------|
| `ADVENOH_STATUS_SLACK_BOT_TOKEN` | `ADVENOH_STATUS_TELEGRAM_BOT_TOKEN` |
| `ADVENOH_STATUS_SLACK_CHANNEL_ID` | `ADVENOH_STATUS_TELEGRAM_CHAT_ID` |

---

## 3. 구현 상세

### 3.1 Telegram Bot 설정

**Bot 생성 및 Token 발급**:
1. Telegram에서 [@BotFather](https://t.me/BotFather) 대화 시작
2. `/newbot` 명령어 입력
3. Bot 이름 및 username 설정
4. 발급된 Bot Token 저장 (형식: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

**Chat ID 확인**:
1. Bot과 대화 시작 (또는 그룹/채널에 Bot 추가)
2. `https://api.telegram.org/bot{TOKEN}/getUpdates` 접속
3. 응답에서 `chat.id` 값 확인

---

### 3.2 pyproject.toml 수정

```toml
[project]
dependencies = [
    "httpx>=0.28.1",
    "supabase>=2.15.1",
    # slack_sdk 제거
]
```

---

### 3.3 health_check.py 수정

#### Import 변경

```python
# 제거
# from slack_sdk import WebClient
# from slack_sdk.errors import SlackApiError

# 추가 import 없음 (httpx 이미 사용 중)
```

#### 환경변수 변경

```python
# 제거
# SLACK_BOT_TOKEN = os.environ.get("ADVENOH_STATUS_SLACK_BOT_TOKEN")
# SLACK_CHANNEL_ID = os.environ.get("ADVENOH_STATUS_SLACK_CHANNEL_ID")

# 추가
TELEGRAM_BOT_TOKEN = os.environ.get("ADVENOH_STATUS_TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("ADVENOH_STATUS_TELEGRAM_CHAT_ID")
```

#### escape_markdown 함수 추가

```python
def escape_markdown(text: str) -> str:
    """Escape special characters for Telegram MarkdownV2."""
    special_chars = r"_*[]()~`>#+-=|{}.!"
    return "".join(f"\\{c}" if c in special_chars else c for c in text)
```

#### send_slack_notification → send_telegram_notification 교체

```python
def send_telegram_notification(result: CheckResult, service: dict) -> None:
    """Send Telegram notification for status change."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping notification")
        return

    status_emoji = "🔴" if result.status == "ERROR" else "🟡"
    text = (
        f"{status_emoji} *\\[{result.status}\\] {escape_markdown(service['name'])}*\n\n"
        f"*URL:* {escape_markdown(service['url'])}\n"
        f"*HTTP Status:* {result.http_status or 'N/A'}\n"
        f"*Response Time:* {result.response_time}ms\n"
        f"*Message:* {escape_markdown(result.message or '-')}\n\n"
        f"🕐 {time.strftime('%Y-%m-%d %H:%M:%S')} KST"
    )

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "MarkdownV2",
    }

    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload)
            if response.status_code == 200:
                print(f"Telegram notification sent for {service['name']}")
            else:
                print(f"Telegram API error: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Error sending Telegram notification: {e}")
```

#### main() 함수 호출 변경

```python
# 기존
if status_changed and result.status in ("WARN", "ERROR"):
    send_slack_notification(result, service)

# 변경
if status_changed and result.status in ("WARN", "ERROR"):
    send_telegram_notification(result, service)
```

---

### 3.4 GitHub Actions 워크플로우 수정

`.github/workflows/health-check.yml`에서 환경변수 변경:

```yaml
env:
  ADVENOH_STATUS_SUPABASE_URL: ${{ secrets.ADVENOH_STATUS_SUPABASE_URL }}
  ADVENOH_STATUS_SUPABASE_API_KEY: ${{ secrets.ADVENOH_STATUS_SUPABASE_API_KEY }}
  ADVENOH_STATUS_TELEGRAM_BOT_TOKEN: ${{ secrets.ADVENOH_STATUS_TELEGRAM_BOT_TOKEN }}
  ADVENOH_STATUS_TELEGRAM_CHAT_ID: ${{ secrets.ADVENOH_STATUS_TELEGRAM_CHAT_ID }}
```

기존 `ADVENOH_STATUS_SLACK_BOT_TOKEN`, `ADVENOH_STATUS_SLACK_CHANNEL_ID` 제거.

---

### 3.5 GitHub Secrets 설정

Repository Settings > Secrets and variables > Actions에서:

| Secret Name | Value |
|------------|-------|
| `ADVENOH_STATUS_TELEGRAM_BOT_TOKEN` | `123456789:ABCdefGHI...` (BotFather 발급) |
| `ADVENOH_STATUS_TELEGRAM_CHAT_ID` | `-1001234567890` (채팅 ID) |

기존 Slack 관련 Secret 2개 삭제.

---

### 3.6 문서 업데이트

#### CLAUDE.md

- `ADVENOH_STATUS_SLACK_BOT_TOKEN` → `ADVENOH_STATUS_TELEGRAM_BOT_TOKEN`
- `ADVENOH_STATUS_SLACK_CHANNEL_ID` → `ADVENOH_STATUS_TELEGRAM_CHAT_ID`
- "Slack Webhook (alerts on status change)" → "Telegram Bot (alerts on status change)"

#### README.md

- 아키텍처 다이어그램에서 Slack → Telegram 변경

---

## 4. 로컬 테스트

### 4.1 환경변수 설정 (~/.zshrc)

```bash
export ADVENOH_STATUS_TELEGRAM_BOT_TOKEN="123456789:ABCdefGHI..."
export ADVENOH_STATUS_TELEGRAM_CHAT_ID="-1001234567890"
```

### 4.2 테스트 실행

```bash
cd scripts
uv sync
source ~/.zshrc
uv run python health_check.py
```

### 4.3 확인 사항

- [ ] `uv pip list`에서 `slack-sdk`가 없는지 확인
- [ ] Telegram에서 MarkdownV2 포맷 메시지 수신
- [ ] 이모지, 볼드, 줄바꿈 정상 표시

---

## 5. Telegram 메시지 구조

```
🔴 [ERROR] Service Name

*URL:* example.com
*HTTP Status:* 500
*Response Time:* 1234ms
*Message:* Timeout

🕐 2024-01-15 10:30:00 KST
```

---

## 6. 참고 자료

- [Telegram Bot API - sendMessage](https://core.telegram.org/bots/api#sendmessage)
- [MarkdownV2 스타일](https://core.telegram.org/bots/api#markdownv2-style)
- [BotFather로 Bot 만들기](https://core.telegram.org/bots/tutorial)
