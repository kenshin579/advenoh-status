# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

시스템 서버 모니터링 서비스 - A lightweight monitoring system that checks service health from GitHub Actions, stores results in Supabase, and displays status via a Netlify-hosted static website.

### Architecture

```
GitHub Actions (15min cron, 정각 회피) → Supabase DB → Static Web (Netlify)
         ↓
   Telegram Bot (alerts on status change)
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
```

## Project Structure

```
advenoh-status/
├── .github/workflows/health-check.yml   # GitHub Actions (15min cron, 정각 회피)
├── scripts/
│   ├── health_check.py                  # Python health check script
│   └── pyproject.toml                   # Python deps (httpx, supabase)
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
- Alerts only fire on status **change** (prevents notification flooding)
