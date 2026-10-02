import ssl

import notifier
from notifier import SmtpConfig, TelegramConfig, send_all, send_email

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

    def starttls(self, context=None):
        self.calls.append(("starttls", isinstance(context, ssl.SSLContext) and context.verify_mode == ssl.CERT_REQUIRED and context.check_hostname))

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
    assert smtp.timeout == 10
    assert smtp.calls == [
        ("starttls", True),
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


def test_send_email_header_error_returns_false(monkeypatch, make_event):
    FakeSMTP.instances = []
    monkeypatch.setattr(notifier.smtplib, "SMTP", FakeSMTP)
    assert send_email(make_event(service_name="bad\nname"), SMTP_CFG) is False


def test_send_all_invalid_smtp_port_is_failure_not_crash(monkeypatch, make_event):
    for k, v in SMTP_ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setenv("ADVENOH_STATUS_SMTP_PORT", "smtp.gmail.com")
    monkeypatch.setattr(notifier, "send_telegram", lambda e, c: True)
    assert send_all(make_event()) == {"telegram": True, "email": False}
