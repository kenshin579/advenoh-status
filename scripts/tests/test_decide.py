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
