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
