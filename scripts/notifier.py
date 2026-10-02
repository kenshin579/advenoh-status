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
