# PRD - Slack → Telegram 알림 전환

## 1. 프로젝트 개요

현재 서비스 상태 변경 알림을 Slack (`slack_sdk.WebClient`)으로 전송하고 있으나, **Telegram Bot API**를 사용하여 Telegram으로 전환한다.

---

## 2. 목표

- Slack 알림을 Telegram Bot API 기반 알림으로 교체
- 기존 알림 트리거 로직(상태 변경 시 WARN/ERROR만 발송)은 그대로 유지
- Telegram Markdown 포맷을 활용한 메시지 구성

---

## 3. 현재 상태 분석

### 3.1 구현 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| Slack 알림 | 구현됨 | `slack_sdk.WebClient` + Block Kit |
| Telegram 알림 | 미구현 | - |

### 3.2 현재 코드 (`scripts/health_check.py`)

```python
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

SLACK_BOT_TOKEN = os.environ.get("ADVENOH_STATUS_SLACK_BOT_TOKEN")
SLACK_CHANNEL_ID = os.environ.get("ADVENOH_STATUS_SLACK_CHANNEL_ID")

def send_slack_notification(result: CheckResult, service: dict) -> None:
    client = WebClient(token=SLACK_BOT_TOKEN)
    blocks = [...]  # Block Kit 메시지
    client.chat_postMessage(channel=SLACK_CHANNEL_ID, text=..., blocks=blocks)
```

### 3.3 Slack vs Telegram 비교

| 항목 | Slack (현재) | Telegram (전환) |
|------|-------------|----------------|
| SDK | `slack_sdk` (외부 라이브러리) | `httpx` (이미 사용 중) |
| 인증 | Bot Token (xoxb-...) | Bot Token (숫자:문자열) |
| 대상 지정 | Channel ID | Chat ID |
| 메시지 포맷 | Block Kit (JSON) | MarkdownV2 / HTML |
| API 호출 | `chat.postMessage` | `sendMessage` |
| 추가 의존성 | `slack_sdk>=3.27.0` | 없음 (`httpx` 재활용) |

---

## 4. 주요 기능 요구사항

### 4.1 Telegram Bot API 연동

#### 사전 준비

1. [@BotFather](https://t.me/BotFather)에서 Bot 생성 → Bot Token 발급
2. Bot을 채널/그룹에 추가하거나 개인 DM으로 Chat ID 확인

#### 구현 항목

| 항목 | 설명 | 필수 |
|------|------|------|
| `sendMessage` API 호출 | `httpx`로 Telegram Bot API POST | O |
| MarkdownV2 포맷 | 상태 메시지 포맷팅 | O |
| 에러 핸들링 | API 응답 코드 확인 및 로깅 | O |
| Slack 코드 제거 | `slack_sdk` import 및 관련 코드 삭제 | O |

### 4.2 메시지 포맷

#### Telegram MarkdownV2 메시지 구성

```
🔴 [ERROR] Service Name

*URL:* example\.com
*HTTP Status:* 500
*Response Time:* 1234ms
*Message:* Timeout

🕐 2024\-01\-15 10:30:00 KST
```

#### 상태별 이모지

| 상태 | 이모지 |
|------|--------|
| ERROR | 🔴 |
| WARN | 🟡 |

---

## 5. 기술 요구사항

### 5.1 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `scripts/health_check.py` | `send_slack_notification` → `send_telegram_notification` 교체 |
| `scripts/pyproject.toml` | `slack_sdk` 의존성 제거 |
| `.github/workflows/health-check.yml` | 환경변수 변경 (Slack → Telegram) |
| `CLAUDE.md` | 환경변수 문서 업데이트 |
| `README.md` | 아키텍처 설명 Slack → Telegram 변경 |

### 5.2 환경변수

| 제거 (Slack) | 추가 (Telegram) |
|-------------|----------------|
| `ADVENOH_STATUS_SLACK_BOT_TOKEN` | `ADVENOH_STATUS_TELEGRAM_BOT_TOKEN` |
| `ADVENOH_STATUS_SLACK_CHANNEL_ID` | `ADVENOH_STATUS_TELEGRAM_CHAT_ID` |

#### GitHub Actions Secrets 변경

- 기존 Slack 시크릿 2개 제거
- Telegram 시크릿 2개 추가

### 5.3 구현 상세

#### Telegram Bot API 호출 방식

```python
TELEGRAM_BOT_TOKEN = os.environ.get("ADVENOH_STATUS_TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("ADVENOH_STATUS_TELEGRAM_CHAT_ID")

def send_telegram_notification(result: CheckResult, service: dict) -> None:
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

#### MarkdownV2 이스케이프 함수

```python
def escape_markdown(text: str) -> str:
    """Escape special characters for Telegram MarkdownV2."""
    special_chars = r"_*[]()~`>#+-=|{}.!"
    return "".join(f"\\{c}" if c in special_chars else c for c in text)
```

### 5.4 알림 트리거 로직 (변경 없음)

```python
# 기존 로직 그대로 유지 - 함수명만 변경
if status_changed and result.status in ("WARN", "ERROR"):
    send_telegram_notification(result, service)  # slack → telegram
```

---

## 6. 기대 효과

| 항목 | 효과 |
|------|------|
| 의존성 감소 | `slack_sdk` 제거, `httpx`만으로 구현 (이미 사용 중) |
| 간편한 설정 | @BotFather로 Bot 생성만 하면 완료 |
| 모바일 알림 | Telegram 앱 푸시 알림으로 즉시 확인 |
| 무료 사용 | Telegram Bot API 무료 (Slack은 워크스페이스 제한) |

---

## 7. 관련 문서

- `2_telegram_implementation.md` - 구현 상세 문서
- `2_telegram_todo.md` - 단계별 체크리스트

---

## 8. 참고 자료

- [Telegram Bot API - sendMessage](https://core.telegram.org/bots/api#sendmessage)
- [MarkdownV2 스타일](https://core.telegram.org/bots/api#markdownv2-style)
- [BotFather로 Bot 만들기](https://core.telegram.org/bots/tutorial)
