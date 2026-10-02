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
