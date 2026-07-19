# Uptime 데이터 1000행 잘림 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `daily_status_summary` 조회가 Supabase Max Rows(1000)에서 잘려 최근 날짜가 비는 회귀 버그를, 클라이언트 페이지네이션 + 과다조회 제거 + Asia/Seoul 타임존 통일로 수정한다.

**Architecture:** 원인 지점인 `useUptimeData` 훅에서 범위 쿼리를 1000개씩 페이지네이션해 전체 행을 확보한다(재사용 헬퍼 `fetchAllRows`). history의 365일 과다조회를 실제 표시 범위로 축소하고, 저장(`health_check.py`)·조회(`dateUtils`) 날짜 버킷을 KST(UTC+9)로 통일한다. RPC/View 전환은 프론트 데이터 shape를 바꿔 회귀 위험이 커 채택하지 않는다.

**Tech Stack:** Next.js(App Router) + TypeScript, `@supabase/ssr`, Python 3.12 health check. 이 저장소는 단위 테스트 러너가 없어(Playwright E2E만) 각 태스크 검증은 `npx tsc --noEmit` / `npm run lint` / 실 Supabase 재현(자격증명은 `~/.zshrc`의 `ADVENOH_STATUS_*`)으로 수행한다.

**참조 spec:** `docs/superpowers/specs/2026-07-19-uptime-truncation-design.md`

---

## 파일 구조

- **생성** `src/lib/fetchAllRows.ts` — PostgREST 범위 쿼리 페이지네이션 헬퍼 (단일 책임)
- **수정** `src/hooks/useServices.ts` — `useUptimeData`가 `fetchAllRows` 사용 + 안정 정렬 + 에러 상태
- **수정** `src/lib/dateUtils.ts` — `toLocalDateString` 구현을 Asia/Seoul 고정으로 교체 + `daysToCoverMonths` 추가
- **수정** `src/app/history/page.tsx` — `useUptimeData(365)` → 표시 범위 계산값
- **수정** `scripts/health_check.py` — 일별 summary 날짜 버킷을 KST로

---

## Task 1: 페이지네이션 헬퍼 `fetchAllRows`

**Files:**
- Create: `src/lib/fetchAllRows.ts`

- [ ] **Step 1: 헬퍼 작성**

`src/lib/fetchAllRows.ts`:

```ts
/**
 * PostgREST 응답은 서버측 Max Rows(현재 1000)로 잘린다.
 * 범위 쿼리를 1000개씩 페이지네이션해 전체 행을 모은다.
 *
 * @param buildQuery 매 페이지마다 새 쿼리 빌더를 생성하는 팩토리.
 *   (빌더는 await 시 소비되므로 페이지마다 새로 만들어야 한다.)
 */
const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  buildQuery: () => {
    range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
  }
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd /Users/user/src/workspace_blogv2/advenoh-status && npx tsc --noEmit`
Expected: 에러 없음 (신규 파일만 추가되었으므로 통과)

- [ ] **Step 3: 실 데이터로 페이지네이션 접근 검증**

스크래치패드에 `verify_pagination.sh` 작성 후 실행 — `fetchAllRows`와 동일한 방식(range 1000씩 반복)으로 실제 `daily_status_summary`를 끝까지 받아 전체 건수와 최신 날짜 존재를 확인한다:

```bash
source ~/.zshrc >/dev/null 2>&1
URL="$ADVENOH_STATUS_SUPABASE_URL"; KEY="$ADVENOH_STATUS_SUPABASE_API_KEY"
FROM=0; PAGE=1000; TOTAL=0; LATEST=""
while :; do
  TO=$((FROM+PAGE-1))
  BODY=$(curl -s "${URL}/rest/v1/daily_status_summary?select=date&order=date.asc,service_id.asc" \
    -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}" -H "Range-Unit: items" -H "Range: ${FROM}-${TO}")
  N=$(python3 -c 'import sys,json;print(len(json.load(sys.stdin)))' <<<"$BODY")
  L=$(python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[-1]["date"] if d else "")' <<<"$BODY")
  TOTAL=$((TOTAL+N)); [ -n "$L" ] && LATEST="$L"
  [ "$N" -lt "$PAGE" ] && break
  FROM=$((FROM+PAGE))
done
echo "총 수집 행수: $TOTAL"
echo "최신 날짜: $LATEST"
```

Expected: `총 수집 행수`가 단일조회 1000보다 큼(현재 ~1686), `최신 날짜: 2026-07-19`

- [ ] **Step 4: 커밋**

```bash
cd /Users/user/src/workspace_blogv2/advenoh-status
git add src/lib/fetchAllRows.ts
git commit -m "feat: PostgREST Max Rows 우회용 fetchAllRows 페이지네이션 헬퍼 추가"
```

---

## Task 2: `useUptimeData`를 페이지네이션 + 안정 정렬 + 에러 처리로 교체

**Files:**
- Modify: `src/hooks/useServices.ts:1-5` (import 추가), `src/hooks/useServices.ts:62-102` (`useUptimeData` 본문)

- [ ] **Step 1: import 추가**

`src/hooks/useServices.ts` 상단 import 블록(4번 줄 `import { createClient }` 아래)에 추가:

```ts
import { fetchAllRows } from '@/lib/fetchAllRows';
```

- [ ] **Step 2: `useUptimeData` 본문 교체**

`src/hooks/useServices.ts`의 `useUptimeData` 함수(62–102줄) 전체를 아래로 교체:

```ts
export function useUptimeData(days: number = 90) {
  const [data, setData] = useState<DailyStatusSummary[]>([]);
  const [summaryByDate, setSummaryByDate] = useState<SummaryByDate>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchUptimeData() {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startKey = startDate.toISOString().split('T')[0];

      try {
        const summaryData = await fetchAllRows<DailyStatusSummary>(() =>
          supabase
            .from('daily_status_summary')
            .select(`
              *,
              services:service_id (name, url)
            `)
            .gte('date', startKey)
            .order('date', { ascending: true })
            .order('service_id', { ascending: true })
        );

        // 날짜별 Map 구조로 사전 처리
        const dateMap = new Map<string, DailyStatusSummary[]>();
        summaryData.forEach((item) => {
          if (!dateMap.has(item.date)) {
            dateMap.set(item.date, []);
          }
          dateMap.get(item.date)!.push(item);
        });

        setData(summaryData);
        setSummaryByDate(dateMap);
        setError(null);
      } catch (err) {
        // 부분 데이터를 완전한 것처럼 렌더링하지 않는다(원래 버그 재현 방지)
        setError(err instanceof Error ? err.message : 'Failed to fetch uptime data');
        console.error('useUptimeData fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUptimeData();
  }, [days, supabase]);

  return { data, summaryByDate, loading, error };
}
```

> 주의: 반환값에 `error`가 추가되지만 기존 소비자(`src/app/page.tsx`, `src/app/history/page.tsx`)는 `{ summaryByDate, loading }`만 구조분해하므로 하위 호환된다.

- [ ] **Step 3: 타입 체크 + 린트**

Run: `cd /Users/user/src/workspace_blogv2/advenoh-status && npx tsc --noEmit && npm run lint`
Expected: 에러/경고 없음.
(만약 `fetchAllRows` 팩토리 인자에서 빌더 할당 타입 에러가 나면, 팩토리 반환에 `as unknown as { range: (from: number, to: number) => PromiseLike<{ data: DailyStatusSummary[] | null; error: unknown }> }` 캐스트를 추가한다. 통과하면 불필요.)

- [ ] **Step 4: 커밋**

```bash
cd /Users/user/src/workspace_blogv2/advenoh-status
git add src/hooks/useServices.ts
git commit -m "fix: useUptimeData 페이지네이션 적용해 최신 날짜 잘림 해결

* Max Rows 1000 + 오름차순으로 최근 데이터가 조회에서 누락되던 회귀 수정
* (date, service_id) 안정 정렬 + 조회 실패 시 error 상태 반환"
```

---

## Task 3: history 과다 조회(365일) 제거

**Files:**
- Modify: `src/lib/dateUtils.ts` (헬퍼 추가)
- Modify: `src/app/history/page.tsx:8` (import), `src/app/history/page.tsx:41` (호출)

- [ ] **Step 1: `daysToCoverMonths` 헬퍼 추가**

`src/lib/dateUtils.ts` 맨 끝에 추가:

```ts
/**
 * MonthlyCalendar가 표시하는 `months`개월(현재 월 포함) 구간의
 * 가장 이른 날(= months-1개월 전 1일)부터 오늘까지의 일수를 반환한다.
 * useUptimeData(days)에 넘겨 불필요한 과다 조회를 막는다.
 */
export const daysToCoverMonths = (months: number): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliest = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  const diffMs = today.getTime() - earliest.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 2; // +2일 여유
};
```

- [ ] **Step 2: history 페이지에서 사용**

`src/app/history/page.tsx` 8번 줄 import 교체:

```ts
import { toLocalDateString, daysToCoverMonths } from '@/lib/dateUtils';
```

41번 줄 교체:

```ts
  const { summaryByDate, loading } = useUptimeData(daysToCoverMonths(6));
```

- [ ] **Step 3: 계산값 sanity 확인 + 타입 체크**

Run:
```bash
cd /Users/user/src/workspace_blogv2/advenoh-status
node -e 'const t=new Date();t.setHours(0,0,0,0);const e=new Date(t.getFullYear(),t.getMonth()-5,1);console.log("days=",Math.ceil((t-e)/864e5)+2)'
npx tsc --noEmit
```
Expected: `days=` 값이 대략 160~190 사이(365보다 확연히 작음), tsc 에러 없음.

- [ ] **Step 4: 커밋**

```bash
cd /Users/user/src/workspace_blogv2/advenoh-status
git add src/lib/dateUtils.ts src/app/history/page.tsx
git commit -m "perf: history 조회를 6개월 표시 범위로 축소(365일 과다조회 제거)"
```

---

## Task 4: 프론트 날짜 키를 Asia/Seoul 고정으로 통일

**Files:**
- Modify: `src/lib/dateUtils.ts:16-25` (`toLocalDateString` 구현/주석)

- [ ] **Step 1: `toLocalDateString` 구현 교체**

`src/lib/dateUtils.ts`의 기존 `toLocalDateString`(16–25줄, JSDoc 포함)을 아래로 교체:

```ts
/**
 * Date(instant)를 서비스 표준 타임존 Asia/Seoul(UTC+9 고정, DST 없음)의
 * YYYY-MM-DD 날짜 키로 변환한다.
 * 저장 파이프라인(health_check.py)이 KST 날짜로 버킷팅하므로 조회/렌더도 동일 기준을 쓴다.
 * 호출부 호환을 위해 함수명은 유지한다.
 */
export const toLocalDateString = (date: Date): string => {
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
};
```

> 이 함수의 모든 호출부(`UptimeGrid.tsx`, `MonthlyCalendar.tsx`, `DayDetailPanel.tsx`, `useResponseTrace.ts`, `history/page.tsx`, 그리고 `dateUtils.ts` 내부 `calcUptime30d`)는 전부 "해당 달력일의 버킷 키"를 원하므로 동작이 일치한다. 한국(KST) 뷰어 기준 로컬 자정 Date는 Seoul 포맷 시 같은 날짜가 되어 변화 없음.

- [ ] **Step 2: 타입 체크 + 린트**

Run: `cd /Users/user/src/workspace_blogv2/advenoh-status && npx tsc --noEmit && npm run lint`
Expected: 에러/경고 없음.

- [ ] **Step 3: 변환 로직 sanity 확인**

Run:
```bash
node -e 'const f=d=>new Date(d.getTime()+9*3600e3).toISOString().slice(0,10); console.log(f(new Date("2026-07-18T15:00:00Z")), f(new Date("2026-07-18T21:00:00Z")))'
```
Expected: `2026-07-19 2026-07-19` (UTC 15:00·21:00 둘 다 KST로는 7/19 → 같은 버킷)

- [ ] **Step 4: 커밋**

```bash
cd /Users/user/src/workspace_blogv2/advenoh-status
git add src/lib/dateUtils.ts
git commit -m "fix: 날짜 키를 Asia/Seoul 고정으로 통일(저장 버킷과 정합)"
```

---

## Task 5: health check 일별 summary 날짜를 KST로 버킷팅

**Files:**
- Modify: `scripts/health_check.py:12` (import), `scripts/health_check.py:26` 부근(상수), `scripts/health_check.py:105` (날짜)

- [ ] **Step 1: import에 timedelta 추가**

`scripts/health_check.py` 12번 줄 교체:

```python
from datetime import datetime, timezone, timedelta
```

- [ ] **Step 2: KST 상수 추가**

26번 줄 `StatusType = Literal["OK", "WARN", "ERROR"]` 바로 아래에 추가:

```python

# 일별 버킷 기준 타임존 (한국은 DST 없이 UTC+9 고정)
KST = timezone(timedelta(hours=9))
```

- [ ] **Step 3: 날짜 버킷을 KST로 변경**

105번 줄 교체:

```python
    today = datetime.now(KST).date().isoformat()
```

> `updated_at`(144번 줄)은 timestamptz라 UTC(`datetime.now(timezone.utc)`) 유지 — 변경하지 않는다.

- [ ] **Step 4: 파이썬 컴파일 체크**

Run: `cd /Users/user/src/workspace_blogv2/advenoh-status && python3 -m py_compile scripts/health_check.py && echo OK`
Expected: `OK` (문법 에러 없음)

- [ ] **Step 5: 커밋**

```bash
cd /Users/user/src/workspace_blogv2/advenoh-status
git add scripts/health_check.py
git commit -m "fix: 일별 상태 summary 날짜 버킷을 UTC에서 KST로 변경"
```

---

## Task 6: 종합 검증

**Files:** (변경 없음 — 검증만)

- [ ] **Step 1: 전체 타입/린트/파이썬 체크**

Run:
```bash
cd /Users/user/src/workspace_blogv2/advenoh-status
npx tsc --noEmit && npm run lint && python3 -m py_compile scripts/health_check.py && echo ALL_OK
```
Expected: `ALL_OK`

- [ ] **Step 2: 수정된 조회 로직 end-to-end 실 데이터 검증**

Task 1의 `verify_pagination.sh`를 history 범위(`daysToCoverMonths(6)` 하한, 약 168일 전)로 재실행해, 페이지네이션 결과 Map에 **최근 날짜(2026-07, 2026-06)와 오늘(2026-07-19)**이 포함되는지 확인:

```bash
source ~/.zshrc >/dev/null 2>&1
URL="$ADVENOH_STATUS_SUPABASE_URL"; KEY="$ADVENOH_STATUS_SUPABASE_API_KEY"
# 6개월 표시 범위 하한(대략 2026-02-01)부터 전체 페이지 수집 후 월 분포 확인
curl -s "${URL}/rest/v1/daily_status_summary?select=date&date=gte.2026-02-01&order=date.asc,service_id.asc" \
  -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}" -H "Range-Unit: items" -H "Range: 0-999" -o /tmp/p0.json
curl -s "${URL}/rest/v1/daily_status_summary?select=date&date=gte.2026-02-01&order=date.asc,service_id.asc" \
  -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}" -H "Range-Unit: items" -H "Range: 1000-1999" -o /tmp/p1.json
python3 -c 'import json,collections;d=json.load(open("/tmp/p0.json"))+json.load(open("/tmp/p1.json"));c=collections.Counter(x["date"][:7] for x in d);print("월별 분포:",dict(sorted(c.items())));print("2026-07 포함:", any(x["date"]=="2026-07-19" for x in d))'
```
Expected: 월별 분포에 `2026-06`, `2026-07`이 포함되고 `2026-07 포함: True`. (수정 전에는 5월에서 끊겨 6·7월이 없었음)

- [ ] **Step 3 (선택): 로컬 dev 육안 확인**

`.env.local`에 실 자격증명을 임시로 채워(gitignore 확인 후) dev 서버로 확인. `.gitignore`에 `.env.local`이 포함되어 있는지 먼저 확인하고, 없으면 이 단계를 건너뛴다.

```bash
cd /Users/user/src/workspace_blogv2/advenoh-status
grep -q '^\.env\.local$' .gitignore && echo "gitignored OK" || echo "SKIP: .env.local이 gitignore 안 됨"
```

gitignore 확인되면 `.env.local`을 아래로 임시 작성 후 `npm run dev`:
```
NEXT_PUBLIC_SUPABASE_URL=<ADVENOH_STATUS_SUPABASE_URL 값>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ADVENOH_STATUS_SUPABASE_API_KEY 값>
```
브라우저에서 `/`(90일 그리드 오른쪽 끝), `/history`(6·7월 캘린더)가 채워졌는지 확인. 확인 후 `.env.local`을 원래 플레이스홀더로 되돌린다.

Expected: 최근 날짜 셀이 정상 렌더(빈 셀 아님).

- [ ] **Step 4: 최종 상태 확인**

Run: `cd /Users/user/src/workspace_blogv2/advenoh-status && git log --oneline -6 && git status --short`
Expected: Task 1~5 커밋 존재, 워킹트리 깨끗(임시 `.env.local`/스크래치 파일 없음).

---

## 완료 후

- PR 생성(`gh pr create` + HEREDOC, 리뷰어 미지정) 여부는 사용자 확인 후 진행.
- 코드 병합/배포 후 실제 사이트(status.advenoh.pe.kr)에서 최근 데이터 렌더 최종 확인.
