# Slack SDK WebClient 전환 구현 문서

## 1. 개요

현재 Slack Webhook + httpx 방식을 `slack_sdk.WebClient` 방식으로 전환하여 안정성과 확장성을 개선합니다.

---

## 2. 구현 범위

### 2.1 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `scripts/pyproject.toml` | `slack_sdk>=3.27.0` 의존성 추가 |
| `scripts/health_check.py` | WebClient 사용으로 전환, Block Kit 적용 |
| `.github/workflows/health-check.yml` | 환경변수 변경 |

### 2.2 환경변수 변경

| 기존 | 신규 |
|------|------|
| `ADVENOH_STATUS_SLACK_WEBHOOK_URL` | `ADVENOH_STATUS_SLACK_BOT_TOKEN` |
| - | `ADVENOH_STATUS_SLACK_CHANNEL_ID` |

---

## 3. 구현 상세

### 3.1 Slack App 설정

**Bot Token 발급**:
1. [Slack API](https://api.slack.com/apps) 접속
2. Create New App > From scratch
3. OAuth & Permissions > Bot Token Scopes 추가:
   - `chat:write` - 메시지 전송
   - `chat:write.public` - public 채널 전송
4. Install to Workspace
5. Bot User OAuth Token 복사 (`xoxb-...`)

**채널 ID 확인**:
- Slack 채널 우클릭 > View channel details > 맨 하단에 채널 ID 표시

---

### 3.2 pyproject.toml 수정

```toml
[project]
dependencies = [
    "httpx>=0.28.1",
    "supabase>=2.15.1",
    "slack_sdk>=3.27.0",  # 추가
]
```

---

### 3.3 health_check.py 수정

#### Import 추가

```python
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
```

#### 환경변수 변경

```python
# 기존 제거
# SLACK_WEBHOOK_URL = os.environ.get("ADVENOH_STATUS_SLACK_WEBHOOK_URL")

# 신규 추가
SLACK_BOT_TOKEN = os.environ.get("ADVENOH_STATUS_SLACK_BOT_TOKEN")
SLACK_CHANNEL_ID = os.environ.get("ADVENOH_STATUS_SLACK_CHANNEL_ID")
```

#### send_slack_notification 함수 전체 교체

```python
def send_slack_notification(result: CheckResult, service: dict) -> None:
    """Send Slack notification for status change using slack_sdk WebClient."""
    if not SLACK_BOT_TOKEN or not SLACK_CHANNEL_ID:
        print("SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not set, skipping notification")
        return

    client = WebClient(token=SLACK_BOT_TOKEN)

    status_emoji = ":red_circle:" if result.status == "ERROR" else ":large_yellow_circle:"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{status_emoji} [{result.status}] {service['name']}",
                "emoji": True
            }
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*URL:*\n{service['url']}"},
                {"type": "mrkdwn", "text": f"*HTTP Status:*\n{result.http_status or 'N/A'}"},
                {"type": "mrkdwn", "text": f"*Response Time:*\n{result.response_time}ms"},
                {"type": "mrkdwn", "text": f"*Message:*\n{result.message or '-'}"}
            ]
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f":clock1: {time.strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        }
    ]

    try:
        response = client.chat_postMessage(
            channel=SLACK_CHANNEL_ID,
            text=f"[{result.status}] {service['name']}",  # fallback text
            blocks=blocks
        )
        if response["ok"]:
            print(f"Slack notification sent for {service['name']}")
    except SlackApiError as e:
        print(f"Slack API error: {e.response['error']}")
    except Exception as e:
        print(f"Error sending Slack notification: {e}")
```

---

### 3.4 GitHub Actions 워크플로우 수정

`.github/workflows/health-check.yml`에서 환경변수 변경:

```yaml
env:
  ADVENOH_STATUS_SLACK_BOT_TOKEN: ${{ secrets.ADVENOH_STATUS_SLACK_BOT_TOKEN }}
  ADVENOH_STATUS_SLACK_CHANNEL_ID: ${{ secrets.ADVENOH_STATUS_SLACK_CHANNEL_ID }}
```

기존 `ADVENOH_STATUS_SLACK_WEBHOOK_URL` 제거

---

### 3.5 GitHub Secrets 설정

Repository Settings > Secrets and variables > Actions에서:

| Secret Name | Value |
|------------|-------|
| `ADVENOH_STATUS_SLACK_BOT_TOKEN` | `xoxb-...` (Bot OAuth Token) |
| `ADVENOH_STATUS_SLACK_CHANNEL_ID` | `C12345678` (채널 ID) |

기존 `ADVENOH_STATUS_SLACK_WEBHOOK_URL` 삭제

---

## 4. 로컬 테스트

### 4.1 환경변수 설정 (~/.zshrc)

```bash
export ADVENOH_STATUS_SLACK_BOT_TOKEN="xoxb-..."
export ADVENOH_STATUS_SLACK_CHANNEL_ID="C12345678"
```

### 4.2 테스트 실행

```bash
cd scripts
uv sync
source ~/.zshrc
uv run python health_check.py
```

### 4.3 확인 사항

- [ ] `uv pip list | grep slack` 출력에 `slack-sdk` 표시
- [ ] Slack 채널에 Block Kit 포맷 메시지 수신
- [ ] 메시지에 Header, Section, Context 블록 정상 표시

---

## 5. Block Kit 메시지 구조

```
+----------------------------------+
| 🔴 [ERROR] Service Name           |  <- Header Block
+----------------------------------+
| *URL:*              | *HTTP Status:* |
| https://example.com | 500            |  <- Section Block (fields)
| *Response Time:*    | *Message:*     |
| 1234ms              | Timeout        |
+----------------------------------+
| 🕐 2024-01-15 10:30:00 KST         |  <- Context Block
+----------------------------------+
```

---

## 6. 참고 자료

- [slack_sdk WebClient 공식 문서](https://slack.dev/python-slack-sdk/web/index.html)
- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder)
- [chat.postMessage API](https://api.slack.com/methods/chat.postMessage)
