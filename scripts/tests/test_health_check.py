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
