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


@dataclass
class CheckResult:
    """Health check result for a service."""

    service_id: str
    status: StatusType
    response_time: int
    http_status: int | None
    message: str | None


def check_service(service: dict) -> CheckResult:
    """Check service health and return result."""
    start_time = time.time()

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(service["url"])

        response_time = int((time.time() - start_time) * 1000)
        http_status = response.status_code

        if http_status >= 400:
            status: StatusType = "ERROR"
        elif response_time > service["threshold_ms"]:
            status = "WARN"
        else:
            status = "OK"

        return CheckResult(
            service_id=service["id"],
            status=status,
            response_time=response_time,
            http_status=http_status,
            message=None,
        )
    except Exception as e:
        return CheckResult(
            service_id=service["id"],
            status="ERROR",
            response_time=int((time.time() - start_time) * 1000),
            http_status=None,
            message=str(e),
        )


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


def save_result(result: CheckResult) -> None:
    """Save check result to database."""
    supabase.table("service_status_logs").insert(
        {
            "service_id": result.service_id,
            "status": result.status,
            "response_time": result.response_time,
            "http_status": result.http_status,
            "message": result.message,
        }
    ).execute()


def update_daily_summary(result: CheckResult) -> None:
    """Update daily status summary table."""
    today = datetime.now(KST).date().isoformat()

    # 오늘의 summary 조회
    existing = (
        supabase.table("daily_status_summary")
        .select("*")
        .eq("service_id", result.service_id)
        .eq("date", today)
        .execute()
    )

    if existing.data:
        # UPDATE: 카운트 증가 및 상태 재계산
        row = existing.data[0]
        new_ok = row["ok_count"] + (1 if result.status == "OK" else 0)
        new_warn = row["warn_count"] + (1 if result.status == "WARN" else 0)
        new_error = row["error_count"] + (1 if result.status == "ERROR" else 0)

        # worst status 계산
        if new_error > 0:
            new_status = "ERROR"
        elif new_warn > 0:
            new_status = "WARN"
        else:
            new_status = "OK"

        # 평균 응답시간 재계산
        total_count = new_ok + new_warn + new_error
        prev_total = row["ok_count"] + row["warn_count"] + row["error_count"]
        prev_avg = row["avg_response_time"] or 0
        # 버림(//)은 이미 버림된 prev_avg 에 다시 가중치를 곱해 오차가 누적된다(하루 96회 기준 약 -24ms).
        # 반올림하면 편향 없이 ±수 ms 이내로 유지된다.
        new_avg = round(((prev_avg * prev_total) + result.response_time) / total_count)

        supabase.table("daily_status_summary").update(
            {
                "ok_count": new_ok,
                "warn_count": new_warn,
                "error_count": new_error,
                "status": new_status,
                "avg_response_time": new_avg,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", row["id"]).execute()
    else:
        # INSERT: 새 레코드
        supabase.table("daily_status_summary").insert(
            {
                "service_id": result.service_id,
                "date": today,
                "status": result.status,
                "ok_count": 1 if result.status == "OK" else 0,
                "warn_count": 1 if result.status == "WARN" else 0,
                "error_count": 1 if result.status == "ERROR" else 0,
                "avg_response_time": result.response_time,
            }
        ).execute()


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


def main() -> int:
    """Main function to run health checks. 알림 발송·직전 상태 조회·DB 저장 중 하나라도 실패하면 1 을 반환한다."""
    print("Starting health check...")

    # Get all services
    services = supabase.table("services").select("*").execute().data

    if not services:
        print("No services found")
        return 0

    print(f"Checking {len(services)} services...")
    run_failed = False

    for service in services:
        result = check_service(service)
        try:
            recent = get_recent_statuses(service["id"])
        except Exception as e:
            # 직전 상태를 모르면 알림 판단이 틀어진다. 저장도 건너뛰어 다음 run 이 올바른 이력으로 판단하게 한다
            # (예: 2번째 ERROR 를 저장해 버리면 다음 run 은 [E, E] 를 보고 DOWN 을 영영 보내지 않는다).
            print(f"[{result.status}] {service['name']}: failed to read recent statuses: {e}")
            run_failed = True
            continue
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
            # 알림 상태는 로그 이력으로 계산되므로 저장 실패는 다음 run 의 DOWN/RECOVERED 판단을 어긋나게 한다
            run_failed = True

        if event is not None:
            results = send_all(event)
            if any(v is False for v in results.values()):
                run_failed = True

    print("Health check completed")
    if run_failed:
        print("Health check finished with failures (notification or database)")
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
