# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

시스템 서버 모니터링 서비스 - A lightweight monitoring system that checks service health from GitHub Actions, stores results in Supabase, and displays status via a Netlify-hosted static website.

### Architecture

```
GitHub Actions (5min cron) → Supabase DB → Static Web (Netlify)
         ↓
   Slack Webhook (alerts on status change)
```

- **Health Check**: Python script runs in GitHub Actions, checks HTTP endpoints
- **Database**: Supabase PostgreSQL with RLS (authenticated users only)
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS
- **Auth**: Supabase Auth (Email login)

### Status Logic
- **OK**: HTTP 200 & response time < threshold
- **WARN**: HTTP 200 but response time > threshold_ms (default 3000ms)
- **ERROR**: 4xx/5xx or timeout

Status changes are stored only when different from previous state (deduplication).

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
├── .github/workflows/health-check.yml   # GitHub Actions (5min cron)
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
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service_role key (write access)
- `ADVENOH_STATUS_SLACK_BOT_TOKEN` - Slack Bot Token (xoxb-...)
- `ADVENOH_STATUS_SLACK_CHANNEL_ID` - Slack Channel ID

### Netlify / Local Development
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon public key (read only)

## Database Tables

- `services` - Monitored service URLs with threshold_ms
- `service_status_logs` - Status change history (FK to services)

## Key Implementation Notes

- 90-day uptime grid and monthly calendar use CSS Grid (no chart library)
- ISR with `revalidate` for dashboard data freshness
- Alerts only fire on status **change** (prevents notification flooding)
