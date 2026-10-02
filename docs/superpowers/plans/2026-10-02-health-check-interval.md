# 1단계: 감지 주기 개선 + 조회 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 헬스체크를 정각을 피한 15분 간격으로 돌린다. 그 결과 늘어나는 로그 때문에 대시보드 두 hook이 PostgREST Max Rows(1000)에 걸려 데이터가 잘리지 않도록, 조회 경로를 함께 바꾼다.

**Architecture:**
- `useResponseTrace`는 이미 일별로 집계된 `daily_status_summary.avg_response_time`을 읽는다.
- `useIncidents`는 새 Postgres 함수 `get_status_transitions(since)`를 RPC로 호출해 상태 전환 행만 받는다. 응답은 기존 `fetchAllRows`로 페이지네이션한다.
- incident 계산 로직은 바꾸지 않는다.

**Tech Stack:** Next.js 16 / React 19 / supabase-js(`@supabase/ssr`), Supabase PostgreSQL, GitHub Actions, Python 3.12 + supabase-py 2.24(검증 스크립트)

**Spec:** `docs/superpowers/specs/2026-10-02-down-alert-email-design.md` §1, §3

**Branch:** `feat/down-alert-email` (스펙 커밋 `d0d6c56` 위에서 작업). 2단계는 이 PR이 merge된 뒤 별도 브랜치에서 진행한다(`2026-10-02-down-alert-notify.md`).

---

## 사전 정보 (작업자가 알아야 할 것)

- 저장소 루트는 `advenoh-status/`이다. 아래 명령은 모두 이 루트를 기준으로 한다(별도 표기가 있으면 `scripts/`).
- 프론트엔드에는 단위 테스트 프레임워크가 없다. 검증은 `npx tsc --noEmit`, `npm run build`, Playwright E2E(`tests/`)로 한다.
- **`npm run lint`(= `next lint`)와 `npx eslint`는 이번 변경과 무관하게 이미 깨져 있다**(eslint config가 circular JSON 오류를 냄). 이번 계획에서는 lint를 쓰지 않는다.
- `node_modules`가 없으면 먼저 `npm ci`를 실행한다.
- `npm run build`에는 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 필요하다. 빌드 검증만 할 때는 더미 값으로 충분하다.
- 로컬 셸(`~/.zshrc`)에는 `ADVENOH_STATUS_SUPABASE_URL`과 `ADVENOH_STATUS_SUPABASE_API_KEY`(service key)가 설정되어 있다. 검증 스크립트는 이 값을 쓴다. **운영 DB이므로 읽기 쿼리만 실행한다.**
- Supabase migration은 CLI로 연결되어 있지 않다. **사용자가 Supabase SQL Editor에서 직접 실행한다**(Task 2).

## File Structure

| 파일 | 변경 | 책임 |
|---|---|---|
| `supabase/migrations/007_status_transitions_fn.sql` | Create | 상태 전환 행만 돌려주는 SQL 함수 + anon/authenticated EXECUTE 권한 |
| `src/hooks/useIncidents.ts` | Modify | 조회를 RPC + `fetchAllRows`로 교체. 행 타입 `RawLog` → `TransitionRow` |
| `src/hooks/useResponseTrace.ts` | Modify | 조회를 `daily_status_summary`로 교체 |
| `.github/workflows/health-check.yml` | Modify | cron `0 * * * *` → `7-59/15 * * * *` |
| `CLAUDE.md`, `scripts/README.md` | Modify | 틀린 설명 정정 |

---

### Task 1: migration 007 — `get_status_transitions` 함수

**Files:**
- Create: `supabase/migrations/007_status_transitions_fn.sql`

- [ ] **Step 1: migration 파일 작성**

```sql
-- 007_status_transitions_fn.sql
-- 상태 전환 행만 반환하는 함수
-- service_status_logs 는 체크마다 1행씩 쌓여(15분 간격 × 15개 서비스 ≈ 1,440행/일)
-- PostgREST Max Rows(1000)를 넘는다. 대시보드 incident 계산에는 상태가 바뀐 행만 필요하다.

-- 직전 로그와 status 가 다른 행(상태 전환)만 반환한다.
-- 서비스별 첫 행(since 이후)은 직전 행이 없으므로 항상 포함된다.
CREATE OR REPLACE FUNCTION get_status_transitions(since TIMESTAMPTZ)
RETURNS TABLE (
  id BIGINT,
  service_id UUID,
  service_name TEXT,
  status TEXT,
  "timestamp" TIMESTAMPTZ,
  response_time INT,
  message TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT t.id, t.service_id, s.name, t.status, t."timestamp", t.response_time, t.message
  FROM (
    SELECT l.*,
           LAG(l.status) OVER (PARTITION BY l.service_id ORDER BY l."timestamp", l.id) AS prev_status
    FROM service_status_logs l
    WHERE l."timestamp" >= since
  ) t
  JOIN services s ON s.id = t.service_id
  WHERE t.prev_status IS DISTINCT FROM t.status
  ORDER BY t.service_id, t."timestamp", t.id;
$$;

-- SECURITY INVOKER: 기존 "Public read access for logs/services" RLS 정책이 그대로 적용된다.
GRANT EXECUTE ON FUNCTION get_status_transitions(TIMESTAMPTZ) TO anon, authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/007_status_transitions_fn.sql
git commit -m "feat: 상태 전환 행만 반환하는 get_status_transitions 함수 추가 (migration 007)"
```

---

### Task 2: [사용자] migration 적용 + 동등성 검증

**이 Task는 사람이 해야 하는 단계를 포함한다.** 서브에이전트 실행 중이라면 컨트롤러가 사용자에게 요청하고, 적용됐다는 확인을 받은 뒤 Step 2로 넘어간다.

- [ ] **Step 1: 사용자에게 migration 적용 요청**

사용자에게 다음을 요청한다.
> Supabase Dashboard → SQL Editor에서 `supabase/migrations/007_status_transitions_fn.sql` 전체를 실행해 주세요. 결과가 "Success. No rows returned"이면 됩니다.

- [ ] **Step 2: 적용 확인 + 동등성 검증 (읽기 전용)**

최근 14일 로그 전체를 페이지네이션으로 읽어 Python에서 전환 행을 계산하고, 그 결과를 RPC 결과와 id 목록 단위로 비교한다. 두 목록이 같으면, incident 계산은 전환 행만으로 정해지므로 화면에 나오는 incident도 같다.

```bash
cd scripts && uv run python - <<'EOF'
import os
from datetime import datetime, timedelta, timezone
from supabase import create_client

sb = create_client(os.environ["ADVENOH_STATUS_SUPABASE_URL"], os.environ["ADVENOH_STATUS_SUPABASE_API_KEY"])
since = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

def fetch_all(build):
    rows, start = [], 0
    while True:
        page = build().range(start, start + 999).execute().data
        rows += page
        if len(page) < 1000:
            return rows
        start += 1000

logs = fetch_all(lambda: sb.table("service_status_logs").select("id,service_id,status,timestamp")
                 .gte("timestamp", since).order("service_id").order("timestamp").order("id"))
expected, prev = [], {}
for r in logs:
    sid = r["service_id"]
    if sid not in prev or prev[sid] != r["status"]:
        expected.append(r["id"])
    prev[sid] = r["status"]

got = [r["id"] for r in fetch_all(lambda: sb.rpc("get_status_transitions", {"since": since})
                                 .order("service_id").order("timestamp").order("id"))]

print(f"logs={len(logs)} expected_transitions={len(expected)} rpc_transitions={len(got)}")
print("MATCH" if expected == got else f"MISMATCH: only_expected={set(expected)-set(got)} only_rpc={set(got)-set(expected)}")
EOF
```

Expected: 마지막 줄이 `MATCH`. `rpc_transitions`는 `logs`보다 훨씬 작다(서비스 15개면 최소 15).
- `Could not find the function` 오류: migration이 적용되지 않은 것이다. Step 1로 돌아간다.
- `MISMATCH`: Task 3으로 넘어가지 말고 SQL을 다시 확인한다.

---

### Task 3: `useIncidents`를 RPC로 전환

**Files:**
- Modify: `src/hooks/useIncidents.ts`

- [ ] **Step 1: import와 행 타입 교체**

파일 상단의 import와 `RawLog` 인터페이스를 다음으로 바꾼다.

```ts
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';
import type { Incident, StatusType } from '@/types';

// get_status_transitions() RPC 반환 행 (직전 로그와 status 가 다른 행만)
interface TransitionRow {
  id: number;
  service_id: string;
  service_name: string | null;
  status: StatusType;
  timestamp: string;
  response_time: number | null;
  message: string | null;
}
```

- [ ] **Step 2: 조회 교체**

`fetchIncidents()` 안의 `const { data } = await supabase.from('service_status_logs')...`부터 `const rows = (data as unknown as RawLog[]) || [];`까지를 다음으로 바꾼다. `startDate` 계산 두 줄은 그대로 둔다.

```ts
      // 로그 원본은 PostgREST Max Rows(1000)를 넘으므로 상태 전환 행만 받는다.
      // incident 경계는 정의상 전환 지점이라 아래 계산 결과는 원본 로그로 계산한 것과 같다.
      // 전환이 많은(OK↔WARN 반복) 경우를 대비해 페이지네이션한다.
      const rows = await fetchAllRows<TransitionRow>(() =>
        supabase
          .rpc('get_status_transitions', { since: startDate.toISOString() })
          .order('service_id', { ascending: true })
          .order('timestamp', { ascending: true })
          .order('id', { ascending: true })
      );
```

`fetchAllRows`는 오류가 나면 throw한다. 이 오류는 기존 `fetchIncidents().catch(...)`가 잡아 빈 목록으로 처리하므로 별도 처리는 필요 없다.

- [ ] **Step 3: 나머지 `RawLog` 참조 교체**

- `const grouped = new Map<string, RawLog[]>();` → `const grouped = new Map<string, TransitionRow[]>();`
- `firstLog: RawLog;` → `firstLog: TransitionRow;`
- `openIncident.firstLog.services?.name ?? 'Unknown'` → `openIncident.firstLog.service_name ?? 'Unknown'` (**2곳**: 종료된 incident, 진행 중인 incident)

확인:

```bash
grep -n "RawLog\|services?.name" src/hooks/useIncidents.ts
```

Expected: 출력 없음

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit && echo TSC_OK`
Expected: `TSC_OK`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useIncidents.ts
git commit -m "fix: useIncidents 를 상태 전환 RPC 로 전환해 1000행 잘림 방지"
```

---

### Task 4: `useResponseTrace`를 `daily_status_summary`로 전환

**Files:**
- Modify: `src/hooks/useResponseTrace.ts`

- [ ] **Step 1: 파일 전체를 다음 내용으로 교체**

```ts
'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { toLocalDateString } from '@/lib/dateUtils';
import type { ResponseTracePoint } from '@/types';

export function useResponseTrace(serviceId: string | null, days = 30) {
  const [points, setPoints] = useState<ResponseTracePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!serviceId) {
      setPoints([]);
      setLoading(false);
      return;
    }

    async function fetchTrace() {
      // 일별 평균은 daily_status_summary 에 이미 집계돼 있다(KST 날짜 버킷).
      // 로그 원본을 읽으면 30일치가 PostgREST Max Rows(1000)를 넘어 최근 날짜가 잘린다.
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - days);

      const { data } = await supabase
        .from('daily_status_summary')
        .select('date, avg_response_time')
        .eq('service_id', serviceId)
        .gte('date', toLocalDateString(startDate))
        .order('date', { ascending: true });

      const avgByDate = new Map<string, number>();
      ((data as { date: string; avg_response_time: number | null }[] | null) || []).forEach((row) => {
        if (row.avg_response_time != null) avgByDate.set(row.date, row.avg_response_time);
      });

      const result: ResponseTracePoint[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = toLocalDateString(d);
        result.push({ date: key, avgMs: avgByDate.get(key) ?? 0 });
      }

      setPoints(result);
      setLoading(false);
    }

    fetchTrace();
  }, [serviceId, days, supabase]);

  return { points, loading };
}
```

반환 형태(`ResponseTracePoint[]`, 30일 루프, 데이터가 없는 날은 `avgMs: 0`)는 기존과 같다. 기존에도 날짜 키는 `toLocalDateString`(KST)으로 만들었고, `daily_status_summary.date`도 KST다.

- [ ] **Step 2: 타입체크 + 빌드**

```bash
npx tsc --noEmit && echo TSC_OK
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x npm run build 2>&1 | tail -5
```

Expected: `TSC_OK`, 빌드 출력 끝에 Route 표(`○ /`, `○ /history` 등). 오류 없음.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useResponseTrace.ts
git commit -m "fix: useResponseTrace 를 daily_status_summary 로 전환해 1000행 잘림 방지"
```

---

### Task 5: 로컬 E2E로 실데이터 확인

Task 2에서 migration이 적용된 뒤에만 의미가 있다.

- [ ] **Step 1: 실데이터로 E2E 실행**

로컬에는 `NEXT_PUBLIC_*` env가 없다. 그래서 셸에 있는 `ADVENOH_STATUS_*` 값을 넘겨 dev 서버를 띄운다. service key는 RLS를 우회하므로, anon 권한 확인은 Task 8의 운영 확인에서 따로 한다.

```bash
NEXT_PUBLIC_SUPABASE_URL=$ADVENOH_STATUS_SUPABASE_URL \
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ADVENOH_STATUS_SUPABASE_API_KEY \
npx playwright test tests/app.spec.ts --reporter=line
```

Expected: `4 passed`

- [ ] **Step 2: 화면 확인**

같은 env로 `npm run dev`를 띄우고 `http://localhost:3000`을 연다(chrome-devtools/playwright MCP로 스냅샷을 찍어도 된다).
- ServiceCard sparkline: 최근 날짜까지 막대가 이어진다(오른쪽 끝이 비지 않음).
- Incident 타임라인: 최근 14일 incident가 나온다. Task 2의 `expected_transitions` 중 비-OK 구간이 있다면 그 서비스가 목록에 보인다.

확인이 끝나면 dev 서버를 종료한다.

---

### Task 6: cron 15분 간격 (정각 회피)

**Files:**
- Modify: `.github/workflows/health-check.yml:4-6`

- [ ] **Step 1: schedule 교체**

```yaml
on:
  schedule:
    # 매시 정각은 GitHub Actions 부하가 몰려 schedule 이 지연·드롭된다(실측: 하루 4~6회만 실행).
    # 정각을 피해 7,22,37,52분에 15분 간격으로 실행한다.
    - cron: '7-59/15 * * * *'
  workflow_dispatch:        # Manual trigger
```

- [ ] **Step 2: YAML 문법 확인**

Run: `python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/health-check.yml')); print(d[True]['schedule'])"`
Expected: `[{'cron': '7-59/15 * * * *'}]` (PyYAML은 `on` 키를 `True`로 읽는다)

PyYAML이 없으면 `cd scripts && uv run --with pyyaml python -c "..."`로 실행한다.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/health-check.yml
git commit -m "fix: 헬스체크 cron 을 정각 회피 15분 간격으로 변경 (schedule 드롭 완화)"
```

---

### Task 7: 문서 정정

**Files:**
- Modify: `CLAUDE.md`
- Modify: `scripts/README.md`

- [ ] **Step 1: `CLAUDE.md` 수정**

1. Architecture 다이어그램: `GitHub Actions (5min cron)` → `GitHub Actions (15min cron, 정각 회피)`
2. Project Structure: `# GitHub Actions (5min cron)` → `# GitHub Actions (15min cron, 정각 회피)`
3. Status Logic 마지막 줄 `Status changes are stored only when different from previous state (deduplication).`을 다음으로 교체:

```markdown
Every check is stored in `service_status_logs` (one row per check) and aggregated into `daily_status_summary` (KST daily buckets).
PostgREST Max Rows is 1000, so the dashboard never reads raw logs over long ranges:
- Incidents: `get_status_transitions(since)` RPC (status-change rows only, migration 007) + `fetchAllRows`
- Response trend / uptime: `daily_status_summary`
```

4. Database Tables 목록에 추가:

```markdown
- `daily_status_summary` - Per-service daily counts/worst status/avg response time (KST)
- `get_status_transitions(since)` - SQL function returning only status-change rows
```

5. GitHub Actions Secrets의 틀린 이름 정정: `SUPABASE_URL` → `ADVENOH_STATUS_SUPABASE_URL`, `SUPABASE_SERVICE_KEY` → `ADVENOH_STATUS_SUPABASE_API_KEY` (워크플로가 실제로 쓰는 이름)
6. Architecture의 `**Database**: Supabase PostgreSQL with RLS (authenticated users only)` → `**Database**: Supabase PostgreSQL with RLS (public read for services/logs/summary, admin-only writes)`

- [ ] **Step 2: `scripts/README.md` 수정**

"스크립트 동작"의 4번 `이전 상태와 다를 경우에만 \`service_status_logs\` 테이블에 저장`을 다음으로 교체:

```markdown
4. 매 체크마다 `service_status_logs` 테이블에 저장하고 `daily_status_summary`(KST 일별 집계)를 갱신
```

5번(Telegram 알림)은 2단계에서 고친다.

- [ ] **Step 3: 인코딩 확인 + Commit**

```bash
file -I CLAUDE.md scripts/README.md   # charset=utf-8 이어야 함
git add CLAUDE.md scripts/README.md
git commit -m "docs: cron 주기·로그 저장 방식·조회 경로 설명 정정"
```

---

### Task 8: PR 생성 + 배포 후 확인

- [ ] **Step 1: 최종 검증**

```bash
npx tsc --noEmit && echo TSC_OK
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x npm run build 2>&1 | tail -3
git status --short   # 깨끗해야 함 (.next/ 는 gitignore)
git log --oneline main..HEAD
```

Expected: `TSC_OK`, 빌드 성공. 커밋은 스펙과 계획 문서, Task 1·3·4·6·7.

- [ ] **Step 2: push + PR (리뷰어 지정 금지)**

```bash
git push -u origin feat/down-alert-email
gh pr create --title "fix: 헬스체크 15분 간격 + 대시보드 1000행 잘림 방지 (다운 알림 1단계)" --body "$(cat <<'EOF'
## Summary
- 헬스체크 cron `0 * * * *` → `7-59/15 * * * *`. 매시 정각은 GitHub schedule이 드롭돼 실제로는 하루 4~6회(3~7시간 간격)만 실행되고 있었음
- 체크가 잦아지면 대시보드 조회가 PostgREST Max Rows(1000)에 걸리므로 함께 수정
  - `useIncidents`: 로그 원본 대신 `get_status_transitions(since)` RPC(상태 전환 행만, migration 007) + `fetchAllRows`
  - `useResponseTrace`: 로그 원본 대신 `daily_status_summary.avg_response_time`
- 설계: `docs/superpowers/specs/2026-10-02-down-alert-email-design.md` (2단계 알림은 별도 PR)

## ⚠️ 배포 순서
1. **merge 전에** Supabase SQL Editor에서 `supabase/migrations/007_status_transitions_fn.sql` 적용 (적용 완료: ✅)
2. merge → Netlify 자동 배포 + cron 적용

## Test plan
- [x] RPC 결과와 원본 로그로 계산한 전환 행 id 목록 일치 (MATCH)
- [x] `npx tsc --noEmit`, `npm run build`
- [x] Playwright E2E `tests/app.spec.ts` (실데이터)
- [ ] 배포 후 status.advenoh.pe.kr에서 incident 타임라인·sparkline 확인 (anon 권한)
- [ ] 배포 후 1~2일 schedule 실행 간격 관찰

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

`npm run lint`가 기존부터 깨져 있다는 점(이번 변경과 무관)은 PR 코멘트나 별도 이슈로 남길지 사용자에게 묻는다.

- [ ] **Step 3: [사용자 merge 후] 운영 확인**

1. `https://status.advenoh.pe.kr`에서 incident 타임라인과 sparkline이 나오는지 확인한다. anon key로 RPC가 동작하는지 보는 것이다.
2. 1~2일 뒤 실행 간격을 확인한다.

```bash
gh run list --workflow=health-check.yml --event schedule --limit 40 --json createdAt -q '.[].createdAt'
```

판단 기준: 대체로 15분 간격(±수 분)이면 완료다. 여전히 1시간 이상 비는 구간이 잦으면, 외부 cron이 `workflow_dispatch`를 호출하는 방식으로의 전환을 사용자와 논의한다(스펙 §5 범위 밖 항목).
