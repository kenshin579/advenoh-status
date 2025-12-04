#!/usr/bin/env python3
"""
Service Health Check Script
- Checks HTTP endpoints and stores status in Supabase
- Sends Slack notifications on status changes
"""

import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

import httpx
from supabase import create_client, Client
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# Environment variables
SUPABASE_URL = os.environ["ADVENOH_STATUS_SUPABASE_URL"]
SUPABASE_API_KEY = os.environ["ADVENOH_STATUS_SUPABASE_API_KEY"]
SLACK_BOT_TOKEN = os.environ.get("ADVENOH_STATUS_SLACK_BOT_TOKEN")
SLACK_CHANNEL_ID = os.environ.get("ADVENOH_STATUS_SLACK_CHANNEL_ID")

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
    """Send Slack notification for status change using slack_sdk WebClient."""
    if not SLACK_BOT_TOKEN or not SLACK_CHANNEL_ID:
        print("SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not set, skipping notification")
        return

    client = WebClient(token=SLACK_BOT_TOKEN)

    status_emoji = ":red_circle:" if result.status == "ERROR" else ":large_yellow_circle:"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{status_emoji} [{result.status}] {service['name']}",
                "emoji": True
            }
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*URL:*\n{service['url']}"},
                {"type": "mrkdwn", "text": f"*HTTP Status:*\n{result.http_status or 'N/A'}"},
                {"type": "mrkdwn", "text": f"*Response Time:*\n{result.response_time}ms"},
                {"type": "mrkdwn", "text": f"*Message:*\n{result.message or '-'}"}
            ]
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f":clock1: {time.strftime('%Y-%m-%d %H:%M:%S KST')}"
                }
            ]
        }
    ]

    try:
        response = client.chat_postMessage(
            channel=SLACK_CHANNEL_ID,
            text=f"[{result.status}] {service['name']}",  # fallback text
            blocks=blocks
        )
        if response["ok"]:
            print(f"Slack notification sent for {service['name']}")
    except SlackApiError as e:
        print(f"Slack API error: {e.response['error']}")
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

        # 매번 INSERT
        try:
            save_result(result)
            print(f"  -> Status saved to database")
        except Exception as e:
            print(f"  -> Failed to save to database: {e}")

        # 상태 변경 시 WARN/ERROR면 알림 발송
        if status_changed and result.status in ("WARN", "ERROR"):
            send_slack_notification(result, service)

    print("Health check completed")


if __name__ == "__main__":
    main()
