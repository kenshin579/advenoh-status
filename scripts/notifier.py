"""
알림 판단·메시지 생성·발송 (Telegram + Email).
- Supabase 에 의존하지 않는다(health_check.py 가 조회 결과를 넘겨준다).
- 알림은 ERROR 2회 연속 → DOWN, DOWN 이후 ERROR 아님 → RECOVERED 만 보낸다. WARN 은 알리지 않는다.
"""

import html
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


_KIND_STYLE = {
    "DOWN": {"accent": "#dc2626", "soft": "#fef2f2", "emoji": "\U0001F534"},
    "RECOVERED": {"accent": "#16a34a", "soft": "#f0fdf4", "emoji": "\U0001F7E2"},
}
_LABEL_STYLE = "padding:9px 0;width:116px;color:#6b7280;font-size:13px;border-top:1px solid #f3f4f6;vertical-align:top;"
_VALUE_STYLE = "padding:9px 0;color:#111827;font-size:14px;border-top:1px solid #f3f4f6;word-break:break-all;"


def build_email_html(event: AlertEvent) -> str:
    """메일 앱 호환을 위해 table 레이아웃 + inline style 만 쓴다. 동적 값은 모두 HTML escape 한다."""
    esc = html.escape
    style = _KIND_STYLE[event.kind]
    if event.kind == "DOWN":
        subtitle = "ERROR 2회 연속"
    elif event.down_since is not None:
        subtitle = f"약 {down_minutes(event.down_since, event.occurred_at)}분 만에 복구"
    else:
        subtitle = "복구됨"

    rows = [
        ("URL", f'<a href="{esc(event.url)}" style="color:#2563eb;text-decoration:none;">{esc(event.url)}</a>'),
        ("HTTP Status", esc(str(event.http_status)) if event.http_status is not None else "N/A"),
        ("Response Time", f"{event.response_time:,} ms"),
    ]
    if event.kind == "RECOVERED" and event.down_since is not None:
        rows.append(("다운 시작", esc(_fmt_kst(event.down_since, with_seconds=False))))
    rows.append(("확인 시각", esc(_fmt_kst(event.occurred_at))))
    row_html = "".join(
        f'<tr><td style="{_LABEL_STYLE}">{k}</td><td style="{_VALUE_STYLE}">{v}</td></tr>' for k, v in rows
    )

    message_html = ""
    if event.message:
        message_html = (
            '<tr><td style="padding:14px 28px 0;">'
            '<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Message</div>'
            '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;'
            "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;"
            f'color:#374151;white-space:pre-wrap;word-break:break-all;">{esc(event.message)}</div>'
            "</td></tr>"
        )

    # color-scheme light only: 다크 모드 메일 앱이 색을 반전하지 않고 흰 카드로 보여주게 한다
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate;overflow:hidden;">
<tr><td style="background:{style['accent']};height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px 28px 4px;">
<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:{style['soft']};color:{style['accent']};font-size:12px;font-weight:700;letter-spacing:0.04em;">{style['emoji']} {event.kind}</span>
<div style="margin-top:12px;font-size:22px;font-weight:700;color:#111827;">{esc(event.service_name)}</div>
<div style="margin-top:4px;font-size:14px;color:#6b7280;">{esc(subtitle)}</div>
</td></tr>
<tr><td style="padding:14px 28px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{row_html}</table></td></tr>
{message_html}
<tr><td style="padding:24px 28px 28px;"><a href="{esc(DASHBOARD_URL)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">대시보드 열기 &rarr;</a></td></tr>
</table>
<div style="max-width:560px;margin:12px auto 0;font-size:11px;color:#9ca3af;text-align:center;">advenoh-status &middot; 15분마다 자동 체크</div>
</td></tr></table>
</body></html>"""


def build_email(event: AlertEvent, sender: str, recipients: list[str]) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = f"[advenoh-status] {_title(event)}"
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)
    body = "\n".join(f"{k}: {v}" for k, v in _fields(event))
    msg.set_content(f"{body}\n\n대시보드: {DASHBOARD_URL}\n")
    msg.add_alternative(build_email_html(event), subtype="html")
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
            # 예외 메시지에 설정값(예: int() 에 들어간 문자열)이 담길 수 있어 종류만 남긴다
            print(f"{name} config error: {type(e).__name__}")
            results[name] = False
            continue
        results[name] = send(event, config)
    return results
