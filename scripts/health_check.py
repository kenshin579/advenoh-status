#!/usr/bin/env python3
"""
Service Health Check Script
- Checks HTTP endpoints and stores status in Supabase
- Sends Slack notifications on status changes
"""

import os
import time
from dataclasses import dataclass
from typing import Literal

import httpx
from supabase import create_client, Client

# Environment variables
SUPABASE_URL = os.environ["ADVENOH_STATUS_SUPABASE_URL"]
SUPABASE_API_KEY = os.environ["ADVENOH_STATUS_SUPABASE_API_KEY"]
SLACK_WEBHOOK_URL = os.environ.get("ADVENOH_STATUS_SLACK_WEBHOOK_URL")

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


def get_previous_status(service_id: str) -> str | None:
    """Get previous status from database."""
    result = (
        supabase.table("service_status_logs")
        .select("status")
        .eq("service_id", service_id)
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]["status"]
    return None


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


def send_slack_notification(result: CheckResult, service: dict) -> None:
    """Send Slack notification for status change."""
    if not SLACK_WEBHOOK_URL:
        print("SLACK_WEBHOOK_URL not set, skipping notification")
        return

    color = "#FF0000" if result.status == "ERROR" else "#FFA500"
    status_emoji = "🔴" if result.status == "ERROR" else "🟡"

    payload = {
        "attachments": [
            {
                "color": color,
                "title": f"{status_emoji} [{result.status}] {service['name']}",
                "fields": [
                    {"title": "URL", "value": service["url"], "short": True},
                    {
                        "title": "HTTP Status",
                        "value": str(result.http_status or "N/A"),
                        "short": True,
                    },
                    {
                        "title": "Response Time",
                        "value": f"{result.response_time}ms",
                        "short": True,
                    },
                    {"title": "Message", "value": result.message or "-", "short": False},
                ],
                "ts": int(time.time()),
            }
        ]
    }

    try:
        with httpx.Client() as client:
            response = client.post(SLACK_WEBHOOK_URL, json=payload)
            if response.status_code == 200:
                print(f"Slack notification sent for {service['name']}")
            else:
                print(f"Failed to send Slack notification: {response.status_code}")
    except Exception as e:
        print(f"Error sending Slack notification: {e}")


def main() -> None:
    """Main function to run health checks."""
    print("Starting health check...")

    # Get all services
    services = supabase.table("services").select("*").execute().data

    if not services:
        print("No services found")
        return

    print(f"Checking {len(services)} services...")

    for service in services:
        result = check_service(service)
        previous_status = get_previous_status(service["id"])

        status_changed = result.status != previous_status

        print(
            f"[{result.status}] {service['name']}: "
            f"{result.response_time}ms (HTTP {result.http_status or 'N/A'}) "
            f"- changed: {status_changed}"
        )

        # Save to DB and notify only if status changed
        if status_changed:
            save_result(result)
            print(f"  -> Status saved to database")

            # Send notification for WARN/ERROR
            if result.status in ("WARN", "ERROR"):
                send_slack_notification(result, service)

    print("Health check completed")


if __name__ == "__main__":
    main()
