"""
알림 판단·메시지 생성·발송 (Telegram + Email).
- Supabase 에 의존하지 않는다(health_check.py 가 조회 결과를 넘겨준다).
- 알림은 ERROR 2회 연속 → DOWN, DOWN 이후 ERROR 아님 → RECOVERED 만 보낸다. WARN 은 알리지 않는다.
"""

import os
import re
import smtplib
import ssl
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
    try:
        msg = build_email(event, config.user, config.recipients)
        with smtplib.SMTP(config.host, config.port, timeout=10) as smtp:
            # context 를 넘기지 않으면 smtplib 은 인증서·호스트명을 검증하지 않는다(_create_stdlib_context = unverified)
            smtp.starttls(context=ssl.create_default_context())
            smtp.login(config.user, config.password)
            smtp.send_message(msg)
        print(f"Email sent: {event.kind} {event.service_name}")
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False


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
    """두 채널에 독립적으로 발송한다. 한쪽 실패(설정 오류 포함)가 다른 쪽을 막지 않는다."""
    results: dict[str, bool | None] = {}
    for name, load_config, send in (
        ("telegram", TelegramConfig.from_env, send_telegram),
        ("email", SmtpConfig.from_env, send_email),
    ):
        try:
            config = load_config()
        except Exception as e:
            print(f"{name} config error: {e}")
            results[name] = False
            continue
        results[name] = send(event, config)
    return results
