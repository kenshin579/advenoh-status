# 구현 문서 — 시스템 서버 모니터링 서비스

## 1. 프로젝트 구조

```
advenoh-status/
├── .github/
│   └── workflows/
│       └── health-check.yml       # GitHub Actions 워크플로우
├── scripts/
│   ├── health_check.py            # 헬스체크 스크립트 (Python)
│   └── pyproject.toml             # Python 의존성 (uv)
├── src/
│   └── app/
│       ├── layout.tsx             # 루트 레이아웃
│       ├── page.tsx               # 메인 대시보드
│       ├── history/
│       │   └── page.tsx           # History 페이지
│       └── login/
│           └── page.tsx           # 로그인 페이지
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx          # 메인 대시보드
│   │   ├── ServiceCard.tsx        # 서비스 상태 카드
│   │   ├── UptimeGrid.tsx         # 90일 가용률 격자
│   │   ├── MonthlyCalendar.tsx    # 월별 달력 격자
│   │   ├── StatusBadge.tsx        # 상태 뱃지
│   │   └── Auth/
│   │       ├── LoginForm.tsx      # 로그인 폼
│   │       └── ProtectedRoute.tsx # 인증 라우트
│   ├── lib/
│   │   └── supabase.ts            # Supabase 클라이언트
│   ├── hooks/
│   │   ├── useServices.ts         # 서비스 데이터 훅
│   │   └── useAuth.ts             # 인증 훅
│   └── types/
│       └── index.ts               # 타입 정의
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # DB 스키마
├── public/
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── .env.example
```

---

## 2. 기술 스택

| 구성요소 | 기술 |
|----------|------|
| 프론트엔드 | Next.js 16 (App Router) + TypeScript |
| 스타일링 | Tailwind CSS |
| 백엔드/DB | Supabase (PostgreSQL) |
| 인증 | Supabase Auth |
| 헬스체크 스크립트 | Python 3.12+ (uv) |
| CI/CD | GitHub Actions |
| 호스팅 | Netlify |
| 알림 | Slack Webhook |

> **참고**: 90일 가용률 격자와 월별 달력은 CSS Grid로 구현 (별도 차트 라이브러리 불필요)

---

## 3. Supabase 설정

### 3.1 DB 스키마 (SQL)

```sql
-- services 테이블
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  threshold_ms INT DEFAULT 3000,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- service_status_logs 테이블 (상태 변경 시에만 저장)
CREATE TABLE service_status_logs (
  id BIGSERIAL PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  status TEXT CHECK (status IN ('OK', 'WARN', 'ERROR')),
  response_time INT,
  http_status INT,
  message TEXT
);

-- notification_channels 테이블
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('slack')),
  target TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_logs_service_timestamp ON service_status_logs(service_id, timestamp DESC);
CREATE INDEX idx_logs_timestamp ON service_status_logs(timestamp DESC);
```

### 3.2 Row Level Security (RLS)

```sql
-- services 테이블 RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

-- service_status_logs 테이블 RLS
ALTER TABLE service_status_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read logs"
  ON service_status_logs FOR SELECT
  TO authenticated
  USING (true);

-- notification_channels 테이블 RLS
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read channels"
  ON notification_channels FOR SELECT
  TO authenticated
  USING (true);
```

### 3.3 초기 데이터

```sql
INSERT INTO services (name, url, threshold_ms) VALUES
  ('Insquire Me', 'https://insquire-me.advenoh.pe.kr', 3000),
  ('ArgoCD', 'https://argocd.advenoh.pe.kr', 3000),
  ('Redis Insight', 'https://redisinsight.advenoh.pe.kr', 3000);

INSERT INTO notification_channels (type, target) VALUES
  ('slack', 'YOUR_SLACK_WEBHOOK_URL');
```

---

## 4. GitHub Actions 헬스체크

### 4.1 워크플로우 (.github/workflows/health-check.yml)

```yaml
name: Service Health Check

on:
  schedule:
    - cron: '*/5 * * * *'  # 5분마다 실행
  workflow_dispatch:        # 수동 실행 가능

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install uv
        uses: astral-sh/setup-uv@v4

      - name: Install dependencies
        run: uv sync --project scripts/pyproject.toml

      - name: Run health check
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: uv run --project scripts/pyproject.toml python scripts/health_check.py
```

### 4.2 Python 의존성 (scripts/pyproject.toml)

```toml
[project]
name = "health-check"
version = "0.1.0"
description = "Service health check script"
requires-python = ">=3.12"
dependencies = [
    "httpx>=0.27.0",
    "supabase>=2.0.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

### 4.3 헬스체크 스크립트 핵심 로직 (scripts/health_check.py)

```python
#!/usr/bin/env python3
import os
import time
from dataclasses import dataclass
from typing import Literal

import httpx
from supabase import create_client, Client

# 환경 변수
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


@dataclass
class CheckResult:
    service_id: str
    status: Literal["OK", "WARN", "ERROR"]
    response_time: int
    http_status: int | None
    message: str | None


def check_service(service: dict) -> CheckResult:
    """서비스 상태를 체크하고 결과를 반환"""
    start_time = time.time()
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(service["url"])
        
        response_time = int((time.time() - start_time) * 1000)
        http_status = response.status_code
        
        if http_status >= 400:
            status = "ERROR"
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
    """이전 상태 조회"""
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
    """결과를 DB에 저장 (상태 변경 시에만)"""
    supabase.table("service_status_logs").insert({
        "service_id": result.service_id,
        "status": result.status,
        "response_time": result.response_time,
        "http_status": result.http_status,
        "message": result.message,
    }).execute()


def main():
    # 서비스 목록 조회
    services = supabase.table("services").select("*").execute().data
    
    for service in services:
        result = check_service(service)
        previous_status = get_previous_status(service["id"])
        
        # 상태가 변경된 경우에만 저장 및 알림
        if result.status != previous_status:
            save_result(result)
            
            # WARN/ERROR인 경우 알림 발송
            if result.status in ("WARN", "ERROR"):
                send_slack_notification(result, service)
        
        print(f"[{result.status}] {service['name']}: {result.response_time}ms (changed: {result.status != previous_status})")


if __name__ == "__main__":
    main()
```

---

## 5. 알림 시스템

### 5.1 알림 조건

- 상태가 `WARN` 또는 `ERROR`로 변경될 때
- 이전 상태와 다를 경우에만 발송 (중복 알림 방지)

### 5.2 Slack 알림 (Python)

```python
def send_slack_notification(result: CheckResult, service: dict) -> None:
    """Slack으로 알림 발송"""
    if not SLACK_WEBHOOK_URL:
        return
    
    color = "#FF0000" if result.status == "ERROR" else "#FFA500"
    
    payload = {
        "attachments": [{
            "color": color,
            "title": f"[{result.status}] {service['name']}",
            "fields": [
                {"title": "URL", "value": service["url"], "short": True},
                {"title": "HTTP Status", "value": str(result.http_status or "N/A"), "short": True},
                {"title": "Response Time", "value": f"{result.response_time}ms", "short": True},
                {"title": "Message", "value": result.message or "-", "short": False},
            ],
            "ts": int(time.time()),
        }]
    }
    
    with httpx.Client() as client:
        client.post(SLACK_WEBHOOK_URL, json=payload)
```

---

## 6. 프론트엔드 구현 (Next.js)

### 6.1 Supabase 클라이언트

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 6.2 메인 대시보드 페이지

```typescript
// src/app/page.tsx
import { supabase } from '@/lib/supabase';
import Dashboard from '@/components/Dashboard';
import UptimeGrid from '@/components/UptimeGrid';

export const revalidate = 60; // ISR: 60초마다 재생성

async function getServicesWithLatestStatus() {
  // 각 서비스의 최신 상태 조회
  const { data: services } = await supabase
    .from('services')
    .select('*');

  // 각 서비스별 최신 상태
  const servicesWithStatus = await Promise.all(
    services?.map(async (service) => {
      const { data: logs } = await supabase
        .from('service_status_logs')
        .select('status, timestamp')
        .eq('service_id', service.id)
        .order('timestamp', { ascending: false })
        .limit(1);
      
      return {
        ...service,
        currentStatus: logs?.[0]?.status || 'OK',
        lastChecked: logs?.[0]?.timestamp,
      };
    }) || []
  );

  return servicesWithStatus;
}

async function getUptimeData(days: number = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: logs } = await supabase
    .from('service_status_logs')
    .select('service_id, status, timestamp')
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: true });

  return logs;
}

export default async function HomePage() {
  const services = await getServicesWithLatestStatus();
  const uptimeData = await getUptimeData();
  
  return (
    <div>
      <Dashboard services={services} />
      <UptimeGrid data={uptimeData} days={90} />
    </div>
  );
}
```

### 6.3 90일 가용률 격자 컴포넌트

```typescript
// src/components/UptimeGrid.tsx
'use client';

interface UptimeGridProps {
  data: Array<{ service_id: string; status: string; timestamp: string }>;
  days: number;
}

export default function UptimeGrid({ data, days }: UptimeGridProps) {
  // 일별 상태 계산 (해당 날짜의 최악 상태)
  const getDailyStatus = (date: Date): 'OK' | 'WARN' | 'ERROR' => {
    const dateStr = date.toISOString().split('T')[0];
    const dayLogs = data.filter(log => 
      log.timestamp.startsWith(dateStr)
    );
    
    if (dayLogs.some(log => log.status === 'ERROR')) return 'ERROR';
    if (dayLogs.some(log => log.status === 'WARN')) return 'WARN';
    return 'OK';
  };

  const statusColors = {
    OK: 'bg-green-500',
    WARN: 'bg-yellow-500',
    ERROR: 'bg-red-500',
  };

  // 최근 N일 생성
  const dates = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return date;
  });

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">90일 가용률</h3>
      <div className="flex gap-1 flex-wrap">
        {dates.map((date, i) => {
          const status = getDailyStatus(date);
          return (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${statusColors[status]} cursor-pointer`}
              title={`${date.toLocaleDateString()}: ${status}`}
            />
          );
        })}
      </div>
      <div className="flex gap-4 mt-2 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-sm" /> OK
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded-sm" /> WARN
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-sm" /> ERROR
        </span>
      </div>
    </div>
  );
}
```

### 6.4 History 페이지 (월별 달력)

```typescript
// src/app/history/page.tsx
import { supabase } from '@/lib/supabase';
import MonthlyCalendar from '@/components/MonthlyCalendar';

async function getHistoryData() {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12); // 최근 1년

  const { data: logs } = await supabase
    .from('service_status_logs')
    .select('service_id, status, timestamp')
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: true });

  return logs;
}

export default async function HistoryPage() {
  const historyData = await getHistoryData();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Uptime History</h1>
      <MonthlyCalendar data={historyData} />
    </div>
  );
}
```

### 6.5 월별 달력 컴포넌트

```typescript
// src/components/MonthlyCalendar.tsx
'use client';

interface MonthlyCalendarProps {
  data: Array<{ service_id: string; status: string; timestamp: string }>;
}

export default function MonthlyCalendar({ data }: MonthlyCalendarProps) {
  const getDailyStatus = (date: Date): 'OK' | 'WARN' | 'ERROR' | null => {
    const dateStr = date.toISOString().split('T')[0];
    const dayLogs = data.filter(log => log.timestamp.startsWith(dateStr));
    
    if (dayLogs.length === 0) return null;
    if (dayLogs.some(log => log.status === 'ERROR')) return 'ERROR';
    if (dayLogs.some(log => log.status === 'WARN')) return 'WARN';
    return 'OK';
  };

  const statusColors = {
    OK: 'bg-green-500',
    WARN: 'bg-yellow-500',
    ERROR: 'bg-red-500',
  };

  // 최근 6개월 생성
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date;
  }).reverse();

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  return (
    <div className="space-y-8">
      {months.map((monthDate) => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        return (
          <div key={`${year}-${month}`}>
            <h3 className="text-lg font-semibold mb-2">
              {monthDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center text-sm text-gray-500 p-1">
                  {day}
                </div>
              ))}
              {/* 빈 칸 */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="p-1" />
              ))}
              {/* 날짜 */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = new Date(year, month, i + 1);
                const status = getDailyStatus(date);
                return (
                  <div
                    key={i}
                    className={`p-1 text-center rounded cursor-pointer ${
                      status ? statusColors[status] : 'bg-gray-100'
                    } ${status ? 'text-white' : 'text-gray-400'}`}
                    title={`${date.toLocaleDateString()}: ${status || 'No data'}`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 7. 환경 변수

### GitHub Actions Secrets

| 변수명 | 설명 |
|--------|------|
| SUPABASE_URL | Supabase 프로젝트 URL |
| SUPABASE_SERVICE_KEY | Supabase service_role key |
| SLACK_WEBHOOK_URL | Slack Incoming Webhook URL |

### Netlify 환경 변수

| 변수명 | 설명 |
|--------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon public key |

---

## 8. Netlify 배포 설정

### netlify.toml

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 빌드 명령어

```bash
npm run build
```
