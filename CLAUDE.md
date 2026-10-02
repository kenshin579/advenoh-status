# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

시스템 서버 모니터링 서비스 - A lightweight monitoring system that checks service health from GitHub Actions, stores results in Supabase, and displays status via a Netlify-hosted static website.

### Architecture

```
GitHub Actions (15min cron, 정각 회피) → Supabase DB → Static Web (Netlify)
         ↓
   Telegram Bot + Email (Gmail SMTP) — DOWN/RECOVERED only
```

- **Health Check**: Python script runs in GitHub Actions, checks HTTP endpoints
- **Database**: Supabase PostgreSQL with RLS (public read for services/logs/summary, admin-only writes)
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS
- **Auth**: Supabase Auth (Email login)

### Status Logic
- **OK**: HTTP 200 & response time < threshold
- **WARN**: HTTP 200 but response time > threshold_ms (default 3000ms)
- **ERROR**: 4xx/5xx or timeout

Every check is stored in `service_status_logs` (one row per check) and aggregated into `daily_status_summary` (KST daily buckets).
PostgREST Max Rows is 1000, so the dashboard never reads raw logs over long ranges:
- Incidents: `get_status_transitions(since)` RPC (status-change rows only, migration 007) + `fetchAllRows`
- Response trend / uptime: `daily_status_summary`

## Build & Development Commands

```bash
# Frontend (Next.js)
npm install
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint

# Python health check (using uv)
cd scripts
uv sync              # Install dependencies
uv run python health_check.py  # Run health check locally
uv run pytest              # Unit tests (notifier, health_check)
```

## Project Structure

```
advenoh-status/
├── .github/workflows/health-check.yml   # GitHub Actions (15min cron, 정각 회피)
├── scripts/
│   ├── health_check.py                  # Python health check script
│   ├── notifier.py                      # Alert decision + Telegram/Email delivery
│   ├── tests/                           # pytest unit tests
│   └── pyproject.toml                   # Python deps (httpx, supabase; dev: pytest)
├── src/
│   ├── app/                             # Next.js App Router pages
│   ├── components/                      # React components
│   ├── lib/supabase.ts                  # Supabase client
│   ├── hooks/                           # Custom hooks (useAuth, useServices)
│   └── types/                           # TypeScript types
├── supabase/migrations/                 # DB schema migrations
└── netlify.toml                         # Netlify config
```

## Environment Variables

### GitHub Actions Secrets
- `ADVENOH_STATUS_SUPABASE_URL` - Supabase project URL
- `ADVENOH_STATUS_SUPABASE_API_KEY` - Supabase service_role key (write access)
- `ADVENOH_STATUS_TELEGRAM_BOT_TOKEN` - Telegram Bot Token
- `ADVENOH_STATUS_TELEGRAM_CHAT_ID` - Telegram Chat ID
- `ADVENOH_STATUS_SMTP_HOST` / `ADVENOH_STATUS_SMTP_PORT` - SMTP server (smtp.gmail.com / 587)
- `ADVENOH_STATUS_SMTP_USER` / `ADVENOH_STATUS_SMTP_PASSWORD` - Gmail account + app password
- `ADVENOH_STATUS_ALERT_EMAIL_TO` - Alert recipients (comma-separated)

### Netlify / Local Development
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon public key (read only)

## Database Tables

- `services` - Monitored service URLs with threshold_ms
- `service_status_logs` - One row per health check (FK to services)
- `daily_status_summary` - Per-service daily counts/worst status/avg response time (KST)
- `get_status_transitions(since)` - SQL function returning only status-change rows

## Key Implementation Notes

- 90-day uptime grid and monthly calendar use CSS Grid (no chart library)
- ISR with `revalidate` for dashboard data freshness
- Alerts (`scripts/notifier.py`): **DOWN** when ERROR occurs 2 checks in a row, **RECOVERED** when a non-ERROR follows a DOWN (with downtime). WARN never alerts. Telegram and Email are sent independently. The workflow exits 1 (GitHub failure mail is the fallback signal) when any send fails, or when reading recent statuses / saving a check fails — alert state is derived from the log history, so a broken history would drop or duplicate alerts. During a Supabase outage this means a failure mail every 15 min (expected). SMTP uses STARTTLS with certificate verification. Email is multipart/alternative (HTML card + plain text fallback).
- Workflow runs are serialized (`concurrency: health-check`) so a manual run and a scheduled run can't both send the same alert.
- Manual delivery test: `gh workflow run health-check.yml -f test_notify=true`
