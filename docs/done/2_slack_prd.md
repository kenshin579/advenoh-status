# PRD - Slack SDK WebClient 전환

## 1. 프로젝트 개요

현재 Slack 알림 전송 시 Webhook URL과 `httpx`를 직접 사용하고 있으나, 공식 `slack_sdk`의 **WebClient**를 사용하여 안정성과 확장성을 개선한다.

---

## 2. 목표

- Slack Webhook 직접 호출 방식을 `slack_sdk.WebClient` 사용 방식으로 전환
- Block Kit을 활용한 풍부한 메시지 포맷 지원
- 향후 Slack 기능 확장 용이 (스레드, 이모지 리액션, 메시지 수정 등)

---

## 3. 현재 상태 분석

### 3.1 구현 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| Slack 알림 | 구현됨 | Webhook + httpx 직접 호출 |
| slack_sdk 사용 | 미사용 | httpx로 POST 요청 |
| Block Kit | 미사용 | attachments 방식 사용 중 |

### 3.2 현재 코드 (`scripts/health_check.py`)

```python
def send_slack_notification(result: CheckResult, service: dict) -> None:
    if not SLACK_WEBHOOK_URL:
        return

    payload = {
        "attachments": [
            {
                "color": "#FF0000",
                "title": f"[ERROR] {service['name']}",
                "fields": [...],
            }
        ]
    }

    with httpx.Client() as client:
        response = client.post(SLACK_WEBHOOK_URL, json=payload)
```

### 3.3 WebhookClient vs WebClient 비교

| 항목 | WebhookClient | WebClient |
|------|---------------|-----------|
| 인증 방식 | Webhook URL | Bot Token |
| 기능 범위 | 메시지 전송만 | 전체 Slack API |
| 스레드 지원 | 제한적 | 완벽 지원 |
| 메시지 수정 | 불가 | 가능 |
| 리액션 추가 | 불가 | 가능 |
| 권장 여부 | 단순 알림용 | 앱 개발 권장 |

---

## 4. 주요 기능 요구사항

### 4.1 slack_sdk WebClient 도입

#### 사용 라이브러리

```
slack_sdk>=3.27.0
```

#### 구현 항목

| 항목 | 설명 | 필수 |
|------|------|------|
| WebClient 사용 | `slack_sdk.WebClient` | O |
| chat_postMessage | 메시지 전송 API | O |
| Block Kit 메시지 | HeaderBlock, SectionBlock | O |
| SlackApiError 처리 | 에러 핸들링 | O |

### 4.2 메시지 포맷 개선

#### Block Kit 구성

```
+----------------------------------+
| :red_circle: [ERROR] Service Name |  <- Header
+----------------------------------+
| *URL:*          | *HTTP Status:* |
| example.com     | 500            |  <- Section (fields)
|-----------------|----------------|
| *Response Time:*| *Message:*     |
| 1234ms          | Timeout        |
+----------------------------------+
| 2024-01-15 10:30:00 KST          |  <- Context
+----------------------------------+
```

---

## 5. 기술 요구사항

### 5.1 변경 파일

- `scripts/pyproject.toml` - `slack_sdk>=3.27.0` 의존성 추가
- `scripts/health_check.py` - WebClient 사용, Block Kit 적용
- `.github/workflows/health-check.yml` - 환경변수 변경

### 5.2 환경변수

| 기존 | 신규 |
|------|------|
| `ADVENOH_STATUS_SLACK_WEBHOOK_URL` | `ADVENOH_STATUS_SLACK_BOT_TOKEN` |
| - | `ADVENOH_STATUS_SLACK_CHANNEL_ID` |

### 5.3 필수 Bot Token Scopes

- `chat:write` - 메시지 전송
- `chat:write.public` - public 채널 전송 (봇 참여 불필요)

---

## 6. 기대 효과

| 항목 | 효과 |
|------|------|
| 확장성 | 전체 Slack API 사용 가능 (스레드, 리액션, 메시지 수정 등) |
| 안정성 | 공식 SDK의 에러 핸들링, 재시도 로직 활용 |
| 유지보수성 | Slack API 변경 시 SDK 업데이트로 대응 |
| 가독성 | Block Kit으로 구조화된 메시지 |

---

## 7. 참고 자료

- [slack_sdk WebClient 공식 문서](https://slack.dev/python-slack-sdk/web/index.html)
- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder)
- [chat.postMessage API](https://api.slack.com/methods/chat.postMessage)
- [Bot Token Scopes](https://api.slack.com/scopes)
