# 2단계: 다운/복구 알림 (Telegram + 이메일) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ERROR가 연속 2회 나오면 🔴 DOWN을, 그 뒤 ERROR가 아닌 상태로 돌아오면 🟢 RECOVERED(다운 지속 시간 포함)를 Telegram과 이메일(Gmail SMTP)로 보낸다. WARN은 알리지 않는다.

**Architecture:**
- 알림 판단, 메시지 생성, 발송은 Supabase에 의존하지 않는 새 모듈 `scripts/notifier.py`로 분리해 단위 테스트한다.
- `health_check.py`는 DB 조회(직전 2개 상태, 다운 시작 시각)와 흐름만 맡는다. 판단은 INSERT 전에 한다.
- 발송이 하나라도 실패하면 exit 1로 끝내서, GitHub 워크플로 실패 메일이 알림 경로 고장을 알려주게 한다.

**Tech Stack:** Python 3.12, uv, httpx, supabase-py 2.24, 표준 `smtplib`/`email.message`, pytest 8, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-10-02-down-alert-email-design.md` §2, §4

**Prerequisite:** 1단계 PR(`feat/down-alert-email`, 계획 `2026-10-02-health-check-interval.md`)이 main에 merge된 상태여야 한다.

**Branch:**

```bash
git checkout main && git pull origin main
git checkout -b feat/down-alert-notify
```

---

## 사전 정보 (작업자가 알아야 할 것)

- Python 작업 디렉터리는 `scripts/`이다. 의존성 설치는 `uv sync`, 테스트는 `uv run pytest`로 한다.
- `health_check.py`는 **import 시점에** `ADVENOH_STATUS_SUPABASE_URL`과 `ADVENOH_STATUS_SUPABASE_API_KEY`를 읽고 Supabase 클라이언트를 만든다. 테스트에서는 더미 env를 넣고 import한다. 이 단계에서는 네트워크 호출이 일어나지 않는다(supabase-py 2.24에서 확인).
- `notifier.py`는 `health_check.py`를 import하지 않는다(위의 import 부작용을 피하기 위해).
- 로컬 셸에 운영 Supabase env가 설정되어 있다. **로컬에서 `uv run python health_check.py`를 실행하지 않는다.** 운영 DB에 쓰기가 일어나고 실제 알림이 나간다. 확인은 단위 테스트와 Task 7의 읽기 전용 스모크 테스트로만 한다.
- **Gmail 앱 비밀번호는 파일, 커밋, 로그, 계획 문서 어디에도 쓰지 않는다.** Task 9에서 컨트롤러가 대화에서 받은 값을 stdin으로 `gh secret set`에 넘긴다.
- 이 계획의 코드는 scratchpad 프로토타입에서 검증했다(pytest 37 passed).

## File Structure

| 파일 | 변경 | 책임 |
|---|---|---|
| `scripts/pyproject.toml` | Modify | dev 의존성 pytest, pytest 설정 |
| `scripts/uv.lock` | Modify | `uv sync` 결과 |
| `scripts/notifier.py` | Create | `decide_alert`, `down_minutes`, `AlertEvent`, 메시지 생성(email/Telegram), `TelegramConfig`/`SmtpConfig`, `send_telegram`/`send_email`/`send_all` |
| `scripts/tests/conftest.py` | Create | `now`, `make_event` fixture |
| `scripts/tests/test_decide.py` | Create | 판단 로직 테스트 |
| `scripts/tests/test_messages.py` | Create | 메시지 생성 테스트 |
| `scripts/tests/test_email.py` | Create | 설정 로딩·이메일 발송 테스트 |
| `scripts/tests/test_telegram.py` | Create | Telegram 발송·`send_all` 테스트 |
| `scripts/tests/test_health_check.py` | Create | `build_alert`, `main` 종료 코드, `run_test_notify` 테스트 |
| `scripts/health_check.py` | Modify | 기존 Telegram 코드 제거, 직전 상태·다운 시작 조회, 알림 연결, 종료 코드, `--test-notify` |
| `.github/workflows/health-check.yml` | Modify | SMTP env 5개, `test_notify` input |
| `CLAUDE.md`, `scripts/README.md` | Modify | 알림 규칙, env, 테스트 방법 |

---

### Task 1: pytest 설정

**Files:**
- Modify: `scripts/pyproject.toml`
- Modify: `scripts/uv.lock`

- [ ] **Step 1: `scripts/pyproject.toml` 끝에 추가**

```toml

[dependency-groups]
dev = ["pytest>=8.0"]

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

`uv sync`는 dev 그룹을 기본으로 설치한다. 그래서 워크플로의 `uv sync`에도 pytest가 같이 설치되지만, 크기가 작아 문제없다.

- [ ] **Step 2: 설치 확인**

```bash
cd scripts && uv sync && uv run pytest --version
```

Expected: `pytest 8.x.x`

- [ ] **Step 3: Commit**

```bash
git add scripts/pyproject.toml scripts/uv.lock
git commit -m "chore: health check 스크립트에 pytest dev 의존성 추가"
```

---

### Task 2: `decide_alert` + `down_minutes` (TDD)

**Files:**
- Create: `scripts/tests/test_decide.py`
- Create: `scripts/notifier.py`

- [ ] **Step 1: 실패하는 테스트 작성** — `scripts/tests/test_decide.py`

```python
from datetime import datetime, timedelta, timezone

import pytest

from notifier import decide_alert, down_minutes


@pytest.mark.parametrize(
    "current, prev1, prev2, expected",
    [
        ("OK", "ERROR", "OK", None),            # OK, ERROR, OK: 단발 ERROR 무시
        ("ERROR", "OK", "OK", None),            # 첫 ERROR: 아직 알림 없음
        ("ERROR", "ERROR", "OK", "DOWN"),       # 2번째 연속 ERROR
        ("ERROR", "ERROR", "WARN", "DOWN"),
        ("ERROR", "ERROR", None, "DOWN"),       # 로그 1개뿐인 상태에서 2번째 ERROR
        ("ERROR", "ERROR", "ERROR", None),      # 이미 DOWN 보냄
        ("OK", "ERROR", "ERROR", "RECOVERED"),
        ("WARN", "ERROR", "ERROR", "RECOVERED"),
        ("ERROR", None, None, None),            # 최초 로그
        ("OK", "OK", "OK", None),
        ("WARN", "OK", "OK", None),             # WARN 은 알리지 않음
        ("OK", "WARN", "WARN", None),
    ],
)
def test_decide_alert(current, prev1, prev2, expected):
    assert decide_alert(current, prev1, prev2) == expected


def test_down_minutes_rounds():
    start = datetime(2026, 10, 2, 5, 7, 0, tzinfo=timezone.utc)
    assert down_minutes(start, start + timedelta(minutes=31, seconds=40)) == 32
    assert down_minutes(start, start + timedelta(minutes=31, seconds=10)) == 31
```

- [ ] **Step 2: 실패 확인**

Run: `cd scripts && uv run pytest tests/test_decide.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'notifier'`

- [ ] **Step 3: 최소 구현** — `scripts/notifier.py` 생성

뒤 Task에서 쓸 import도 미리 포함한다(이 Task에서는 쓰지 않음).

```python
"""
알림 판단·메시지 생성·발송 (Telegram + Email).
- Supabase 에 의존하지 않는다(health_check.py 가 조회 결과를 넘겨준다).
- 알림은 ERROR 2회 연속 → DOWN, DOWN 이후 ERROR 아님 → RECOVERED 만 보낸다. WARN 은 알리지 않는다.
"""

import os
import re
import smtplib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Literal

import httpx

AlertKind = Literal["DOWN", "RECOVERED"]

# 한국은 DST 없이 UTC+9 고정
KST = timezone(timedelta(hours=9))
DASHBOARD_URL = "https://status.advenoh.pe.kr"


def decide_alert(current: str, prev1: str | None, prev2: str | None) -> AlertKind | None:
    """이번 상태와 직전 2개 상태(최신순)로 보낼 알림 종류를 정한다."""
    if current == "ERROR" and prev1 == "ERROR" and prev2 != "ERROR":
        return "DOWN"
    if current != "ERROR" and prev1 == "ERROR" and prev2 == "ERROR":
        return "RECOVERED"
    return None


def down_minutes(down_since: datetime, now: datetime) -> int:
    """다운 지속 시간(분, 반올림)."""
    return round((now - down_since).total_seconds() / 60)
```

- [ ] **Step 4: 통과 확인**

Run: `cd scripts && uv run pytest tests/test_decide.py -q`
Expected: `13 passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/notifier.py scripts/tests/test_decide.py
git commit -m "feat: 알림 판단 decide_alert (ERROR 2회 연속 DOWN, 복구 RECOVERED)"
```

---

### Task 3: `AlertEvent` + 메시지 생성 (TDD)

**Files:**
- Create: `scripts/tests/conftest.py`
- Create: `scripts/tests/test_messages.py`
- Modify: `scripts/notifier.py` (파일 끝에 추가)

- [ ] **Step 1: fixture 작성** — `scripts/tests/conftest.py`

```python
from datetime import datetime, timezone

import pytest

from notifier import AlertEvent

# 2026-10-02 14:37:12 KST
FIXED_NOW = datetime(2026, 10, 2, 5, 37, 12, tzinfo=timezone.utc)


@pytest.fixture
def now() -> datetime:
    return FIXED_NOW


@pytest.fixture
def make_event():
    def _make(kind="DOWN", **kw) -> AlertEvent:
        base = dict(
            kind=kind,
            service_name="Moneyflow",
            url="https://moneyflow.advenoh.pe.kr",
            http_status=502,
            response_time=1234,
            message="Bad Gateway",
            occurred_at=FIXED_NOW,
        )
        base.update(kw)
        return AlertEvent(**base)

    return _make
```

- [ ] **Step 2: 실패하는 테스트 작성** — `scripts/tests/test_messages.py`

```python
from datetime import timedelta

from notifier import build_email, build_telegram_text


def test_build_email_down(make_event):
    msg = build_email(make_event(), "advenoh@gmail.com", ["a@x.com", "b@x.com"])
    assert msg["Subject"] == "[advenoh-status] \U0001F534 DOWN: Moneyflow"
    assert msg["From"] == "advenoh@gmail.com"
    assert msg["To"] == "a@x.com, b@x.com"
    body = msg.get_content()
    assert "상태: DOWN (ERROR 2회 연속)" in body
    assert "HTTP Status: 502" in body
    assert "Message: Bad Gateway" in body
    assert "시각: 2026-10-02 14:37:12 KST" in body
    assert "다운 시작" not in body
    assert "대시보드: https://status.advenoh.pe.kr" in body


def test_build_email_recovered_has_duration(make_event, now):
    event = make_event(
        kind="RECOVERED",
        http_status=200,
        message=None,
        down_since=now - timedelta(minutes=32),
    )
    msg = build_email(event, "advenoh@gmail.com", ["advenoh@gmail.com"])
    assert msg["Subject"] == "[advenoh-status] \U0001F7E2 RECOVERED: Moneyflow (약 32분 다운)"
    body = msg.get_content()
    assert "상태: RECOVERED" in body
    assert "다운 시작: 2026-10-02 14:05 KST" in body
    assert "Message: -" in body


def test_build_email_recovered_without_down_since(make_event):
    msg = build_email(make_event(kind="RECOVERED"), "a@x.com", ["a@x.com"])
    assert msg["Subject"] == "[advenoh-status] \U0001F7E2 RECOVERED: Moneyflow"
    assert "다운 시작" not in msg.get_content()


def test_build_email_missing_http_status(make_event):
    msg = build_email(make_event(http_status=None), "a@x.com", ["a@x.com"])
    assert "HTTP Status: N/A" in msg.get_content()


def test_build_telegram_text_escapes_markdown(make_event):
    text = build_telegram_text(make_event())
    assert "*\U0001F534 DOWN: Moneyflow*" in text
    assert r"https://moneyflow\.advenoh\.pe\.kr" in text
    assert r"2026\-10\-02 14:37:12 KST" in text
    assert r"\(ERROR 2회 연속\)" in text
```

- [ ] **Step 3: 실패 확인**

Run: `cd scripts && uv run pytest tests/test_messages.py -q`
Expected: FAIL — `ImportError: cannot import name 'AlertEvent' from 'notifier'`

- [ ] **Step 4: 구현** — `scripts/notifier.py` 끝에 추가

```python


@dataclass(frozen=True)
class AlertEvent:
    kind: AlertKind
    service_name: str
    url: str
    http_status: int | None
    response_time: int
    message: str | None
    occurred_at: datetime
    down_since: datetime | None = None  # RECOVERED 에만 사용


def _fmt_kst(dt: datetime, with_seconds: bool = True) -> str:
    fmt = "%Y-%m-%d %H:%M:%S KST" if with_seconds else "%Y-%m-%d %H:%M KST"
    return dt.astimezone(KST).strftime(fmt)


def _title(event: AlertEvent) -> str:
    if event.kind == "DOWN":
        return f"\U0001F534 DOWN: {event.service_name}"
    title = f"\U0001F7E2 RECOVERED: {event.service_name}"
    if event.down_since is not None:
        title += f" (약 {down_minutes(event.down_since, event.occurred_at)}분 다운)"
    return title


def _fields(event: AlertEvent) -> list[tuple[str, str]]:
    state = "DOWN (ERROR 2회 연속)" if event.kind == "DOWN" else "RECOVERED"
    fields = [
        ("서비스", event.service_name),
        ("상태", state),
        ("URL", event.url),
        ("HTTP Status", str(event.http_status) if event.http_status is not None else "N/A"),
        ("Response Time", f"{event.response_time}ms"),
        ("Message", event.message or "-"),
    ]
    if event.kind == "RECOVERED" and event.down_since is not None:
        fields.append(("다운 시작", _fmt_kst(event.down_since, with_seconds=False)))
    fields.append(("시각", _fmt_kst(event.occurred_at)))
    return fields


def build_email(event: AlertEvent, sender: str, recipients: list[str]) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = f"[advenoh-status] {_title(event)}"
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)
    body = "\n".join(f"{k}: {v}" for k, v in _fields(event))
    msg.set_content(f"{body}\n\n대시보드: {DASHBOARD_URL}\n")
    return msg


def escape_markdown(text: str) -> str:
    """Telegram MarkdownV2 특수문자 이스케이프."""
    return re.sub(r"([_*\[\]()~`>#+\-=|{}.!\\])", r"\\\1", str(text))


def build_telegram_text(event: AlertEvent) -> str:
    lines = [f"*{escape_markdown(_title(event))}*", ""]
    lines += [f"*{escape_markdown(k)}:* {escape_markdown(v)}" for k, v in _fields(event)]
    lines += ["", escape_markdown(DASHBOARD_URL)]
    return "\n".join(lines)
```

시각은 모두 `astimezone(KST)`로 변환한다. 기존 코드의 `time.strftime("... KST")`는 runner가 UTC라서 UTC 시각에 KST 라벨을 붙이는 버그가 있었는데, 이 방식으로 고쳐진다.

- [ ] **Step 5: 통과 확인**

Run: `cd scripts && uv run pytest -q`
Expected: `18 passed`

- [ ] **Step 6: Commit**

```bash
git add scripts/notifier.py scripts/tests/conftest.py scripts/tests/test_messages.py
git commit -m "feat: DOWN/RECOVERED 이메일·Telegram 메시지 생성 (KST 시각 표기 수정)"
```

---

### Task 4: 설정 + 이메일 발송 (TDD)

**Files:**
- Create: `scripts/tests/test_email.py`
- Modify: `scripts/notifier.py` (파일 끝에 추가)

- [ ] **Step 1: 실패하는 테스트 작성** — `scripts/tests/test_email.py`

```python
import notifier
from notifier import SmtpConfig, TelegramConfig, send_email

SMTP_ENV = {
    "ADVENOH_STATUS_SMTP_HOST": "smtp.gmail.com",
    "ADVENOH_STATUS_SMTP_PORT": "587",
    "ADVENOH_STATUS_SMTP_USER": "advenoh@gmail.com",
    "ADVENOH_STATUS_SMTP_PASSWORD": "app-password",
    "ADVENOH_STATUS_ALERT_EMAIL_TO": "advenoh@gmail.com, other@x.com",
}
SMTP_CFG = SmtpConfig("smtp.gmail.com", 587, "advenoh@gmail.com", "pw", ["advenoh@gmail.com"])


# ---------- 설정 ----------

def test_smtp_config_from_env(monkeypatch):
    for k, v in SMTP_ENV.items():
        monkeypatch.setenv(k, v)
    assert SmtpConfig.from_env() == SmtpConfig(
        "smtp.gmail.com", 587, "advenoh@gmail.com", "app-password",
        ["advenoh@gmail.com", "other@x.com"],
    )


def test_smtp_config_missing_returns_none(monkeypatch):
    for k, v in SMTP_ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.delenv("ADVENOH_STATUS_SMTP_PASSWORD")
    assert SmtpConfig.from_env() is None


def test_telegram_config_missing_returns_none(monkeypatch):
    monkeypatch.delenv("ADVENOH_STATUS_TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.setenv("ADVENOH_STATUS_TELEGRAM_CHAT_ID", "1")
    assert TelegramConfig.from_env() is None


# ---------- 이메일 ----------

class FakeSMTP:
    instances: list["FakeSMTP"] = []

    def __init__(self, host, port, timeout):
        self.host, self.port, self.timeout = host, port, timeout
        self.calls: list[tuple] = []
        FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self):
        self.calls.append(("starttls",))

    def login(self, user, password):
        self.calls.append(("login", user, password))

    def send_message(self, msg):
        self.calls.append(("send_message", msg["Subject"], msg["To"]))


def test_send_email_success(monkeypatch, make_event):
    FakeSMTP.instances = []
    monkeypatch.setattr(notifier.smtplib, "SMTP", FakeSMTP)
    assert send_email(make_event(), SMTP_CFG) is True
    smtp = FakeSMTP.instances[0]
    assert (smtp.host, smtp.port) == ("smtp.gmail.com", 587)
    assert smtp.calls == [
        ("starttls",),
        ("login", "advenoh@gmail.com", "pw"),
        ("send_message", "[advenoh-status] \U0001F534 DOWN: Moneyflow", "advenoh@gmail.com"),
    ]


def test_send_email_failure_returns_false(monkeypatch, make_event):
    class BrokenSMTP(FakeSMTP):
        def login(self, user, password):
            raise notifier.smtplib.SMTPAuthenticationError(535, b"bad credentials")

    monkeypatch.setattr(notifier.smtplib, "SMTP", BrokenSMTP)
    assert send_email(make_event(), SMTP_CFG) is False


def test_send_email_without_config_returns_none(make_event):
    assert send_email(make_event(), None) is None
```

- [ ] **Step 2: 실패 확인**

Run: `cd scripts && uv run pytest tests/test_email.py -q`
Expected: FAIL — `ImportError: cannot import name 'SmtpConfig' from 'notifier'`

- [ ] **Step 3: 구현** — `scripts/notifier.py` 끝에 추가

두 설정 클래스(`TelegramConfig`, `SmtpConfig`)를 여기서 함께 넣는다. `send_telegram`과 `send_all`은 Task 5에서 추가한다.

```python


@dataclass(frozen=True)
class TelegramConfig:
    bot_token: str
    chat_id: str

    @classmethod
    def from_env(cls) -> "TelegramConfig | None":
        token = os.environ.get("ADVENOH_STATUS_TELEGRAM_BOT_TOKEN")
        chat_id = os.environ.get("ADVENOH_STATUS_TELEGRAM_CHAT_ID")
        if not token or not chat_id:
            return None
        return cls(token, chat_id)


@dataclass(frozen=True)
class SmtpConfig:
    host: str
    port: int
    user: str
    password: str
    recipients: list[str]

    @classmethod
    def from_env(cls) -> "SmtpConfig | None":
        host = os.environ.get("ADVENOH_STATUS_SMTP_HOST")
        port = os.environ.get("ADVENOH_STATUS_SMTP_PORT")
        user = os.environ.get("ADVENOH_STATUS_SMTP_USER")
        password = os.environ.get("ADVENOH_STATUS_SMTP_PASSWORD")
        to = os.environ.get("ADVENOH_STATUS_ALERT_EMAIL_TO")
        if not all([host, port, user, password, to]):
            return None
        recipients = [addr.strip() for addr in to.split(",") if addr.strip()]
        return cls(host, int(port), user, password, recipients)


def send_email(event: AlertEvent, config: SmtpConfig | None) -> bool | None:
    """성공 True, 실패 False, 설정 없음 None."""
    if config is None:
        print("SMTP config not set, skipping")
        return None
    msg = build_email(event, config.user, config.recipients)
    try:
        with smtplib.SMTP(config.host, config.port, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(config.user, config.password)
            smtp.send_message(msg)
        print(f"Email sent: {event.kind} {event.service_name}")
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False
```

- [ ] **Step 4: 통과 확인**

Run: `cd scripts && uv run pytest -q`
Expected: `24 passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/notifier.py scripts/tests/test_email.py
git commit -m "feat: SMTP/Telegram 설정 로딩과 Gmail SMTP 이메일 발송"
```

---

### Task 5: Telegram 발송 + `send_all` (TDD)

**Files:**
- Create: `scripts/tests/test_telegram.py`
- Modify: `scripts/notifier.py` (파일 끝에 추가)

- [ ] **Step 1: 실패하는 테스트 작성** — `scripts/tests/test_telegram.py`

```python
import notifier
from notifier import TelegramConfig, send_all, send_telegram


# ---------- Telegram ----------

class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload
        self.text = str(payload)

    def json(self):
        return self._payload


def fake_httpx_client(response, sink):
    class Client:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def post(self, url, json):
            sink.append((url, json))
            return response

    return Client


def test_send_telegram_success(monkeypatch, make_event):
    sent = []
    monkeypatch.setattr(notifier.httpx, "Client", fake_httpx_client(FakeResponse(200, {"ok": True}), sent))
    assert send_telegram(make_event(), TelegramConfig("TOKEN", "42")) is True
    url, body = sent[0]
    assert url == "https://api.telegram.org/botTOKEN/sendMessage"
    assert body["chat_id"] == "42"
    assert body["parse_mode"] == "MarkdownV2"


def test_send_telegram_api_error_returns_false(monkeypatch, make_event):
    monkeypatch.setattr(notifier.httpx, "Client", fake_httpx_client(FakeResponse(400, {"ok": False}), []))
    assert send_telegram(make_event(), TelegramConfig("TOKEN", "42")) is False


def test_send_telegram_without_config_returns_none(make_event):
    assert send_telegram(make_event(), None) is None


# ---------- send_all ----------

def test_send_all_continues_after_failure(monkeypatch, make_event):
    monkeypatch.setattr(notifier, "send_telegram", lambda e, c: False)
    monkeypatch.setattr(notifier, "send_email", lambda e, c: True)
    assert send_all(make_event()) == {"telegram": False, "email": True}
```

- [ ] **Step 2: 실패 확인**

Run: `cd scripts && uv run pytest tests/test_telegram.py -q`
Expected: FAIL — `ImportError: cannot import name 'send_all' from 'notifier'`

- [ ] **Step 3: 구현** — `scripts/notifier.py` 끝에 추가

```python


def send_telegram(event: AlertEvent, config: TelegramConfig | None) -> bool | None:
    """성공 True, 실패 False, 설정 없음 None."""
    if config is None:
        print("Telegram config not set, skipping")
        return None
    api_url = f"https://api.telegram.org/bot{config.bot_token}/sendMessage"
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                api_url,
                json={
                    "chat_id": config.chat_id,
                    "text": build_telegram_text(event),
                    "parse_mode": "MarkdownV2",
                },
            )
        if resp.status_code == 200 and resp.json().get("ok"):
            print(f"Telegram sent: {event.kind} {event.service_name}")
            return True
        print(f"Telegram API error: {resp.status_code} {resp.text}")
        return False
    except Exception as e:
        print(f"Telegram send error: {e}")
        return False


def send_all(event: AlertEvent) -> dict[str, bool | None]:
    """두 채널에 독립적으로 발송한다. 한쪽 실패가 다른 쪽을 막지 않는다."""
    return {
        "telegram": send_telegram(event, TelegramConfig.from_env()),
        "email": send_email(event, SmtpConfig.from_env()),
    }
```

- [ ] **Step 4: 전체 통과 확인**

Run: `cd scripts && uv run pytest -q`
Expected: `28 passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/notifier.py scripts/tests/test_telegram.py
git commit -m "feat: Telegram 발송과 두 채널 독립 발송 send_all"
```

---

### Task 6: `health_check.py`에 알림 연결 (TDD)

**Files:**
- Create: `scripts/tests/test_health_check.py`
- Modify: `scripts/health_check.py`

- [ ] **Step 1: 실패하는 테스트 작성** — `scripts/tests/test_health_check.py`

```python
import importlib
import sys
from datetime import datetime, timezone

import pytest

SERVICE = {"id": "svc-1", "name": "Moneyflow", "url": "https://moneyflow.advenoh.pe.kr", "threshold_ms": 3000}


@pytest.fixture
def hc(monkeypatch):
    """health_check 는 import 시점에 env 를 읽고 Supabase 클라이언트를 만든다(네트워크 호출 없음)."""
    monkeypatch.setenv("ADVENOH_STATUS_SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("ADVENOH_STATUS_SUPABASE_API_KEY", "test-key")
    sys.modules.pop("health_check", None)
    return importlib.import_module("health_check")


def result(hc, status, http_status=200):
    return hc.CheckResult(
        service_id=SERVICE["id"], status=status, response_time=100,
        http_status=http_status, message=None,
    )


# ---------- build_alert ----------

def test_build_alert_none_for_single_error(hc):
    assert hc.build_alert(SERVICE, result(hc, "ERROR", 502), ["OK", "OK"]) is None


def test_build_alert_down_does_not_query_down_since(hc, monkeypatch):
    def fail(_):
        raise AssertionError("DOWN 에서는 get_down_since 를 호출하지 않는다")

    monkeypatch.setattr(hc, "get_down_since", fail)
    event = hc.build_alert(SERVICE, result(hc, "ERROR", 502), ["ERROR", "OK"])
    assert event.kind == "DOWN"
    assert event.service_name == "Moneyflow"
    assert event.http_status == 502
    assert event.down_since is None


def test_build_alert_recovered_with_down_since(hc, monkeypatch):
    since = datetime(2026, 10, 2, 5, 7, tzinfo=timezone.utc)
    monkeypatch.setattr(hc, "get_down_since", lambda sid: since)
    event = hc.build_alert(SERVICE, result(hc, "OK"), ["ERROR", "ERROR"])
    assert event.kind == "RECOVERED"
    assert event.down_since == since


def test_build_alert_recovered_even_if_down_since_fails(hc, monkeypatch):
    def boom(_):
        raise RuntimeError("db down")

    monkeypatch.setattr(hc, "get_down_since", boom)
    event = hc.build_alert(SERVICE, result(hc, "OK"), ["ERROR", "ERROR"])
    assert event.kind == "RECOVERED"
    assert event.down_since is None


# ---------- main 종료 코드 ----------

class FakeSupabase:
    """main() 의 services 조회만 흉내 낸다."""

    def table(self, name):
        assert name == "services"
        return self

    def select(self, *_):
        return self

    def execute(self):
        class R:
            data = [SERVICE]
        return R()


@pytest.fixture
def run_main(hc, monkeypatch):
    def _run(status, recent, send_result):
        monkeypatch.setattr(hc, "supabase", FakeSupabase())
        monkeypatch.setattr(hc, "check_service", lambda s: result(hc, status, 502 if status == "ERROR" else 200))
        monkeypatch.setattr(hc, "get_recent_statuses", lambda sid: recent)
        monkeypatch.setattr(hc, "get_down_since", lambda sid: None)
        monkeypatch.setattr(hc, "save_result", lambda r: None)
        monkeypatch.setattr(hc, "update_daily_summary", lambda r: None)
        sent = []
        monkeypatch.setattr(hc, "send_all", lambda e: sent.append(e) or send_result)
        return hc.main(), sent

    return _run


def test_main_sends_down_and_returns_0(run_main):
    code, sent = run_main("ERROR", ["ERROR", "OK"], {"telegram": True, "email": True})
    assert code == 0
    assert [e.kind for e in sent] == ["DOWN"]


def test_main_returns_1_when_a_channel_fails(run_main):
    code, _ = run_main("ERROR", ["ERROR", "OK"], {"telegram": True, "email": False})
    assert code == 1


def test_main_skipped_channel_is_not_failure(run_main):
    code, _ = run_main("ERROR", ["ERROR", "OK"], {"telegram": True, "email": None})
    assert code == 0


def test_main_no_alert_for_warn(run_main):
    code, sent = run_main("WARN", ["OK", "OK"], {"telegram": True, "email": True})
    assert code == 0
    assert sent == []


# ---------- --test-notify ----------

def test_run_test_notify_requires_all_channels(hc, monkeypatch):
    monkeypatch.setattr(hc, "send_all", lambda e: {"telegram": True, "email": None})
    assert hc.run_test_notify() == 1
    monkeypatch.setattr(hc, "send_all", lambda e: {"telegram": True, "email": True})
    assert hc.run_test_notify() == 0
```

- [ ] **Step 2: 실패 확인**

Run: `cd scripts && uv run pytest tests/test_health_check.py -q`
Expected: FAIL — `AttributeError: module 'health_check' has no attribute 'build_alert'` 등

- [ ] **Step 3: 모듈 docstring, import, env 교체**

`scripts/health_check.py` 맨 위의 docstring부터 `KST = timezone(timedelta(hours=9))`까지를 다음으로 바꾼다. `TELEGRAM_*` 상수와 `re`, `timedelta` import가 빠지고, `KST`는 notifier에서 가져온다.

```python
#!/usr/bin/env python3
"""
Service Health Check Script
- Checks HTTP endpoints and stores status in Supabase
- Sends DOWN/RECOVERED alerts (Telegram + Email) via notifier.py
"""

import argparse
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

import httpx
from supabase import create_client, Client

from notifier import DASHBOARD_URL, KST, AlertEvent, decide_alert, send_all

# Environment variables
SUPABASE_URL = os.environ["ADVENOH_STATUS_SUPABASE_URL"]
SUPABASE_API_KEY = os.environ["ADVENOH_STATUS_SUPABASE_API_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_API_KEY)

StatusType = Literal["OK", "WARN", "ERROR"]
```

`CheckResult`와 `check_service`는 그대로 둔다.

- [ ] **Step 4: `get_previous_status`를 세 함수로 교체**

`def get_previous_status(...)` 함수 전체(다음 `def save_result` 직전까지)를 다음으로 바꾼다.

```python
def get_recent_statuses(service_id: str, n: int = 2) -> list[str]:
    """Get the latest n statuses from database (newest first)."""
    result = (
        supabase.table("service_status_logs")
        .select("status")
        .eq("service_id", service_id)
        .order("timestamp", desc=True)
        .limit(n)
        .execute()
    )
    return [row["status"] for row in result.data]


def get_down_since(service_id: str) -> datetime | None:
    """현재 ERROR 연속 구간의 첫 ERROR 로그 시각. 이번 결과를 INSERT 하기 전에 호출해야 한다."""
    last_ok = (
        supabase.table("service_status_logs")
        .select("timestamp")
        .eq("service_id", service_id)
        .neq("status", "ERROR")
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
        .data
    )
    query = (
        supabase.table("service_status_logs")
        .select("timestamp")
        .eq("service_id", service_id)
        .eq("status", "ERROR")
    )
    if last_ok:
        query = query.gt("timestamp", last_ok[0]["timestamp"])
    first_error = query.order("timestamp").limit(1).execute().data
    if not first_error:
        return None
    return datetime.fromisoformat(first_error[0]["timestamp"])


def build_alert(service: dict, result: "CheckResult", recent: list[str]) -> AlertEvent | None:
    """직전 상태(최신순)로 알림 여부를 판단하고, 보낼 경우 AlertEvent 를 만든다."""
    prev1 = recent[0] if len(recent) > 0 else None
    prev2 = recent[1] if len(recent) > 1 else None
    kind = decide_alert(result.status, prev1, prev2)
    if kind is None:
        return None

    down_since = None
    if kind == "RECOVERED":
        try:
            down_since = get_down_since(service["id"])
        except Exception as e:
            # 지속 시간을 못 구해도 복구 알림은 보낸다
            print(f"  -> Failed to get down_since: {e}")

    return AlertEvent(
        kind=kind,
        service_name=service["name"],
        url=service["url"],
        http_status=result.http_status,
        response_time=result.response_time,
        message=result.message,
        occurred_at=datetime.now(KST),
        down_since=down_since,
    )
```

`save_result`와 `update_daily_summary`는 그대로 둔다(`update_daily_summary`는 notifier에서 가져온 `KST`를 쓴다).

- [ ] **Step 5: 기존 Telegram 코드를 `run_test_notify`로 교체**

`def escape_markdown(...)`부터 `def send_telegram_notification(...)` 함수 끝까지(즉 `def main()` 직전까지)를 다음으로 바꾼다.

```python
def run_test_notify() -> int:
    """헬스체크 없이 두 채널로 테스트 메시지 1건을 보낸다. 두 채널 모두 성공해야 0."""
    event = AlertEvent(
        kind="DOWN",
        service_name="[TEST] advenoh-status 알림 테스트",
        url=DASHBOARD_URL,
        http_status=None,
        response_time=0,
        message="workflow_dispatch test_notify 로 보낸 테스트 메시지입니다",
        occurred_at=datetime.now(KST),
    )
    results = send_all(event)
    print(f"Test notify results: {results}")
    return 0 if all(v is True for v in results.values()) else 1
```

- [ ] **Step 6: `main()`과 진입점 교체**

`def main()`부터 파일 끝까지를 다음으로 바꾼다.

```python
def main() -> int:
    """Main function to run health checks. 알림 발송이 하나라도 실패하면 1 을 반환한다."""
    print("Starting health check...")

    # Get all services
    services = supabase.table("services").select("*").execute().data

    if not services:
        print("No services found")
        return 0

    print(f"Checking {len(services)} services...")
    notify_failed = False

    for service in services:
        result = check_service(service)
        recent = get_recent_statuses(service["id"])
        previous_status = recent[0] if recent else None

        status_changed = result.status != previous_status

        print(
            f"[{result.status}] {service['name']}: "
            f"{result.response_time}ms (HTTP {result.http_status or 'N/A'}) "
            f"- changed: {status_changed}"
        )

        # 알림 판단은 INSERT 전에 한다(직전 상태·다운 시작 조회에 이번 결과가 섞이지 않도록)
        event = build_alert(service, result, recent)

        # 매번 INSERT
        try:
            save_result(result)
            update_daily_summary(result)
            print(f"  -> Status saved to database")
        except Exception as e:
            print(f"  -> Failed to save to database: {e}")

        if event is not None:
            results = send_all(event)
            if any(v is False for v in results.values()):
                notify_failed = True

    print("Health check completed")
    if notify_failed:
        print("Some notifications failed")
        return 1
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="advenoh-status health check")
    parser.add_argument(
        "--test-notify",
        action="store_true",
        help="헬스체크 없이 Telegram·이메일 테스트 메시지만 보낸다",
    )
    args = parser.parse_args()
    sys.exit(run_test_notify() if args.test_notify else main())
```

- [ ] **Step 7: 잔여 참조 확인 + 전체 테스트**

```bash
cd scripts
grep -n "TELEGRAM_\|send_telegram_notification\|get_previous_status\|time.strftime\|escape_markdown\|timedelta" health_check.py
uv run pytest -q
```

Expected: grep 출력 없음, `37 passed`

- [ ] **Step 8: Commit**

```bash
git add scripts/health_check.py scripts/tests/test_health_check.py
git commit -m "feat: health check 에 DOWN/RECOVERED 알림 연결 + 발송 실패 시 exit 1 + --test-notify"
```

---

### Task 7: 운영 DB 읽기 전용 스모크 테스트 (`get_down_since`, `get_recent_statuses`)

단위 테스트에서는 Supabase 쿼리가 fake로 대체된다. 실제 쿼리 문법(`neq`, `gt`, timestamp 파싱)은 **읽기 전용**으로 직접 확인한다. `main()`은 호출하지 않는다.

- [ ] **Step 1: 실행**

```bash
cd scripts && uv run python - <<'EOF'
import health_check as h
services = h.supabase.table("services").select("id,name").execute().data
for s in services[:5]:
    print(s["name"], h.get_recent_statuses(s["id"]), h.get_down_since(s["id"]))
EOF
```

Expected:
- 서비스 5개가 출력되고 예외가 없다.
- `get_recent_statuses`는 길이 2인 리스트(예: `['OK', 'OK']`)를 돌려준다.
- `get_down_since`는 tz-aware `datetime` 또는 `None`이다. 과거에 ERROR가 있었더라도, 이후 OK가 있었다면 그 OK 이후의 ERROR만 찾으므로 보통 `None`이다.
- 예외가 나면(예: timestamp 파싱, `+` 인코딩) 원인을 고친 뒤 Task 6 테스트를 다시 돌린다.

커밋할 내용은 없다.

---

### Task 8: 워크플로 — SMTP env + `test_notify`

**Files:**
- Modify: `.github/workflows/health-check.yml`

- [ ] **Step 1: `workflow_dispatch`에 input 추가**

```yaml
  workflow_dispatch:        # Manual trigger
    inputs:
      test_notify:
        description: '헬스체크 없이 Telegram·이메일 테스트 메시지만 보낸다'
        type: boolean
        default: false
```

- [ ] **Step 2: `Run health check` step의 env와 run 교체**

```yaml
      - name: Run health check
        working-directory: scripts
        env:
          ADVENOH_STATUS_SUPABASE_URL: ${{ secrets.ADVENOH_STATUS_SUPABASE_URL }}
          ADVENOH_STATUS_SUPABASE_API_KEY: ${{ secrets.ADVENOH_STATUS_SUPABASE_API_KEY }}
          ADVENOH_STATUS_TELEGRAM_BOT_TOKEN: ${{ secrets.ADVENOH_STATUS_TELEGRAM_BOT_TOKEN }}
          ADVENOH_STATUS_TELEGRAM_CHAT_ID: ${{ secrets.ADVENOH_STATUS_TELEGRAM_CHAT_ID }}
          ADVENOH_STATUS_SMTP_HOST: ${{ secrets.ADVENOH_STATUS_SMTP_HOST }}
          ADVENOH_STATUS_SMTP_PORT: ${{ secrets.ADVENOH_STATUS_SMTP_PORT }}
          ADVENOH_STATUS_SMTP_USER: ${{ secrets.ADVENOH_STATUS_SMTP_USER }}
          ADVENOH_STATUS_SMTP_PASSWORD: ${{ secrets.ADVENOH_STATUS_SMTP_PASSWORD }}
          ADVENOH_STATUS_ALERT_EMAIL_TO: ${{ secrets.ADVENOH_STATUS_ALERT_EMAIL_TO }}
        run: uv run python health_check.py ${{ inputs.test_notify && '--test-notify' || '' }}
```

schedule 실행에서는 `inputs.test_notify`가 비어 있으므로 인자 없이 실행된다.

- [ ] **Step 3: YAML 확인**

```bash
cd scripts && uv run --with pyyaml python -c "
import yaml; d = yaml.safe_load(open('../.github/workflows/health-check.yml'))
print(d[True]['workflow_dispatch']['inputs']['test_notify']['type'])
print(sorted(k for k in d['jobs']['health-check']['steps'][-1]['env'] if 'SMTP' in k or 'EMAIL' in k))"
```

Expected:
```
boolean
['ADVENOH_STATUS_ALERT_EMAIL_TO', 'ADVENOH_STATUS_SMTP_HOST', 'ADVENOH_STATUS_SMTP_PASSWORD', 'ADVENOH_STATUS_SMTP_PORT', 'ADVENOH_STATUS_SMTP_USER']
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/health-check.yml
git commit -m "feat: 워크플로에 SMTP env 와 test_notify 수동 실행 옵션 추가"
```

---

### Task 9: [컨트롤러 + 사용자 확인] GitHub Secrets 등록

**서브에이전트에 맡기지 않는다.** 비밀번호를 서브에이전트 프롬프트에 넣지 않기 위해서다. 등록하기 전에 사용자에게 한 번 확인을 받는다.

- [ ] **Step 1: 등록**

값은 대화에서 사용자가 준 것을 쓴다. 비밀번호는 `--body` 인자 대신 stdin으로 넘긴다.

```bash
gh secret set ADVENOH_STATUS_SMTP_HOST --body "smtp.gmail.com"
gh secret set ADVENOH_STATUS_SMTP_PORT --body "587"
gh secret set ADVENOH_STATUS_SMTP_USER --body "advenoh@gmail.com"
gh secret set ADVENOH_STATUS_ALERT_EMAIL_TO --body "advenoh@gmail.com"
printf '%s' '<사용자가 준 앱 비밀번호>' | gh secret set ADVENOH_STATUS_SMTP_PASSWORD
```

- [ ] **Step 2: 확인**

Run: `gh secret list | grep -E "SMTP|ALERT_EMAIL"`
Expected: 5개 Secret이 오늘 날짜로 표시된다.

---

### Task 10: 문서

**Files:**
- Modify: `CLAUDE.md`
- Modify: `scripts/README.md`

- [ ] **Step 1: `CLAUDE.md` 수정**

1. Architecture 다이어그램의 알림 줄:

```
GitHub Actions (15min cron, 정각 회피) → Supabase DB → Static Web (Netlify)
         ↓
   Telegram Bot + Email (Gmail SMTP) — DOWN/RECOVERED only
```

2. "Key Implementation Notes"의 `- Alerts only fire on status **change** (prevents notification flooding)`를 다음으로 교체:

```markdown
- Alerts (`scripts/notifier.py`): **DOWN** when ERROR occurs 2 checks in a row, **RECOVERED** when a non-ERROR follows a DOWN (with downtime). WARN never alerts. Telegram and Email are sent independently; any send failure makes the workflow exit 1 (GitHub failure mail is the fallback signal).
- Manual delivery test: `gh workflow run health-check.yml -f test_notify=true`
```

3. "GitHub Actions Secrets"에 추가:

```markdown
- `ADVENOH_STATUS_SMTP_HOST` / `ADVENOH_STATUS_SMTP_PORT` - SMTP server (smtp.gmail.com / 587)
- `ADVENOH_STATUS_SMTP_USER` / `ADVENOH_STATUS_SMTP_PASSWORD` - Gmail account + app password
- `ADVENOH_STATUS_ALERT_EMAIL_TO` - Alert recipients (comma-separated)
```

4. "Build & Development Commands"의 Python 블록에 `uv run pytest              # Unit tests (notifier, health_check)`를 추가한다.

- [ ] **Step 2: `scripts/README.md` 수정**

1. 환경 변수 블록에 추가:

```bash
export ADVENOH_STATUS_SMTP_HOST='smtp.gmail.com'                     # 선택사항
export ADVENOH_STATUS_SMTP_PORT='587'                                # 선택사항
export ADVENOH_STATUS_SMTP_USER='your-gmail-address'                 # 선택사항
export ADVENOH_STATUS_SMTP_PASSWORD='your-gmail-app-password'        # 선택사항
export ADVENOH_STATUS_ALERT_EMAIL_TO='recipient@example.com'         # 선택사항, 쉼표 구분
```

2. "실행 방법"에 추가:

```bash
# 단위 테스트
uv run pytest
```

3. "스크립트 동작"의 5번을 다음으로 교체:

```markdown
5. 알림 (Telegram + Email, 설정된 채널만):
   - ERROR 2회 연속 → 🔴 DOWN
   - DOWN 이후 ERROR 아님 → 🟢 RECOVERED (다운 지속 시간 포함)
   - WARN 은 알리지 않음. 발송 실패 시 exit 1
```

- [ ] **Step 3: 인코딩 확인 + Commit**

```bash
file -I CLAUDE.md scripts/README.md   # charset=utf-8
git add CLAUDE.md scripts/README.md
git commit -m "docs: 다운/복구 알림 규칙, SMTP 설정, 테스트 방법 문서화"
```

---

### Task 11: PR + 실발송 확인

- [ ] **Step 1: 최종 검증**

```bash
cd scripts && uv run pytest -q && cd ..
git status --short
git log --oneline main..HEAD
```

Expected: `37 passed`, 작업 트리 깨끗함.

- [ ] **Step 2: push + PR (리뷰어 지정 금지)**

```bash
git push -u origin feat/down-alert-notify
gh pr create --title "feat: 다운/복구 알림 이메일 추가 (다운 알림 2단계)" --body "$(cat <<'EOF'
## Summary
- ERROR 2회 연속 → 🔴 DOWN, 이후 ERROR 아님 → 🟢 RECOVERED(다운 지속 시간)를 Telegram + 이메일(Gmail SMTP)로 발송
- WARN 알림 제거 (두 채널 모두)
- 알림 로직을 `scripts/notifier.py`로 분리, pytest 37개
- Telegram 시각이 UTC인데 "KST"로 표기되던 버그 수정
- 발송 실패 시 exit 1 → GitHub 워크플로 실패 메일로 알림 경로 고장 감지
- `workflow_dispatch` `test_notify` 입력으로 실발송 확인
- 설계: `docs/superpowers/specs/2026-10-02-down-alert-email-design.md`

## 설정
- GitHub Secrets `ADVENOH_STATUS_SMTP_HOST/PORT/USER/PASSWORD`, `ADVENOH_STATUS_ALERT_EMAIL_TO` 등록 완료

## Test plan
- [x] `uv run pytest` 37 passed
- [x] 운영 DB 읽기 전용 스모크 (`get_recent_statuses`, `get_down_since`)
- [ ] merge 후 `gh workflow run health-check.yml -f test_notify=true` → Telegram·advenoh@gmail.com 받은편지함 도착 확인

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: [사용자 merge 후] 실발송 확인**

```bash
gh workflow run health-check.yml -f test_notify=true
sleep 5; gh run list --workflow=health-check.yml --limit 1
# 완료되면:
gh run view <run-id> --log | grep -E "Test notify results|Email|Telegram"
```

Expected:
- 로그에 `Test notify results: {'telegram': True, 'email': True}`가 찍히고 run이 success다.
- Telegram과 `advenoh@gmail.com` **받은편지함**(스팸함 아님)에 `[advenoh-status] 🔴 DOWN: [TEST] advenoh-status 알림 테스트`가 도착했는지 사용자에게 확인을 받는다.
- run이 failure면 로그의 `Email send error` / `Telegram API error`로 원인을 확인한다(예: 535 → 앱 비밀번호 오류).

- [ ] **Step 4: 사용자에게 권고**

앱 비밀번호가 대화 기록에 평문으로 남았다. 실발송 확인이 끝나면 Google 계정에서 앱 비밀번호를 재발급하고 `ADVENOH_STATUS_SMTP_PASSWORD`를 갱신하도록 권고한다.
