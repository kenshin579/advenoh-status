# 8. Uptime 데이터 조회 1000행 잘림 수정 (설계)

- 작성일: 2026-07-19
- 브랜치: `fix/uptime-summary-truncation`
- 유형: 버그 수정 (회귀)

## 1. 배경 / 증상

- 대시보드 **Service health timeline (90 DAY)** 오른쪽 끝(최근 며칠) 셀이 비어 렌더됨.
- History **Uptime archive (6 MONTH)** 에서 2026-05-25 이후(June/July 전체)가 완전히 빔. KPI `DAYS`도 잘린 구간 길이(약 114)로 표시됨.

## 2. 근본 원인 (실측 확정)

저장 파이프라인은 정상이다. GitHub Actions cron(`health-check.yml`, 매시간)과 `scripts/health_check.py`는 2026-07-19 현재까지 15개 서비스 모두 `service_status_logs` + `daily_status_summary`에 매 실행 저장 중이다.

문제는 **프론트엔드 조회**다. `src/hooks/useServices.ts`의 `useUptimeData`가 `daily_status_summary`를 조회할 때:

```ts
.gte('date', startDate.toISOString().split('T')[0])
.order('date', { ascending: true });   // limit 없음 + 오름차순
```

- 이 Supabase 인스턴스는 서버측 **Max Rows = 1000** 이 강제된다(실측: 단일 응답 `content-range: 0-999/1686`).
- `.limit()`이 없어 1000행만 반환되고, **오름차순이라 가장 오래된 날짜부터 채워져 최신 날짜가 잘린다.**
- 프론트 쿼리 재현 결과 반환된 최신 날짜 = **2026-05-25** (화면 끊김 지점과 정확히 일치).

### 실측 근거

| 항목 | 값 |
|------|-----|
| `services` 개수 | 15 |
| `daily_status_summary` 최신 날짜 | 2026-07-19 (오늘, 정상 적재) |
| 전체 행 수 | 1686 |
| 단일 조회 반환 | 1000 (`0-999/1686`) |
| 90일 범위 필요 행수 | 1038 (> 1000) |
| 180일(6개월) 범위 필요 행수 | 1562 (> 1000) |

### 회귀 경위

과거 동일 버그를 커밋 `a3d67e4`가 `.limit(10000)` + 내림차순으로 수정했으나, `daily_status_summary` 도입 커밋 `3b009e9`에서 `useUptimeData`를 재작성하며 `.limit()` 제거 + 오름차순으로 되돌아가 **원인이 코드에 재도입**되었다. (`docs/done/2_data_bug.md`, `docs/done/3_bug_data_prd.md` 참조)

## 3. 목표

1. 모든 표시 범위에서 최신 날짜까지 데이터가 잘리지 않고 렌더된다.
2. 데이터가 계속 쌓여도(행수 증가) 재발하지 않는다.
3. 저장/조회 날짜 버킷 기준을 통일해 "오늘" 칸이 시간대 경계에서 비는 부차 증상을 제거한다.

## 4. 설계 (접근 A — 클라이언트 페이지네이션)

RPC/View 전환(접근 B)은 프론트 데이터 shape·컴포넌트를 바꿔 회귀 위험이 크므로 채택하지 않는다. 원인 지점(훅 조회)에서 리스크 최소로 해결한다.

### 4.1 페이지네이션으로 전체 행 조회 (핵심)

- 신규 헬퍼 `src/lib/fetchAllRows.ts` (재사용·격리):
  - PostgREST `.range(from, from + PAGE - 1)`(PAGE = 1000)를 반복 호출, 한 페이지가 PAGE 미만이면 종료 → 범위 내 전체 행 확보.
  - Max Rows 한도 의존 자체를 제거.
- `useServices.ts`의 `useUptimeData` 변경:
  - 단일 쿼리 → `fetchAllRows(query)` 사용.
  - 정렬을 **`(date, service_id)` 복합키로 고정** — 페이지 경계 누락/중복 방지(결정적 순서, `UNIQUE(service_id, date)`라 유일).
  - **에러 처리 추가**: 현재는 에러를 조용히 무시(`const { data }`만 구조분해). 페이지 조회 실패 시 중단하고 훅이 `error` 상태를 반환. 부분 데이터를 완전한 것처럼 렌더링(원래 버그 재현)하지 않는다. 리치 에러 UI는 범위 밖(로딩/빈 상태 유지 + 콘솔 로그).

### 4.2 history 과다 조회 제거

- 현재 `src/app/history/page.tsx`가 6개월만 표시하면서 `useUptimeData(365)` 호출.
- 캘린더 실제 표시 범위(현재 월 포함 6개월, 즉 `(오늘 - 5개월)의 1일`부터 오늘까지)를 정확히 커버하는 일수를 계산하는 작은 헬퍼를 두어 전달. 매직 넘버 대신 계산값으로 불필요한 조회 제거.

### 4.3 타임존 정합성 — `Asia/Seoul` 기준 통일

- **저장** (`scripts/health_check.py`): `datetime.now(timezone.utc).date()` → `datetime.now(ZoneInfo("Asia/Seoul")).date()` 로 버킷팅.
- **조회/렌더** (프론트): 날짜 키 생성 헬퍼(`src/lib/dateUtils.ts`의 `toLocalDateString`)를 뷰어 로컬 → **고정 `Asia/Seoul`** 로 변경(뷰어 위치와 무관하게 저장 버킷과 일치). 한국에서 보는 경우 현재 로컬이 이미 KST라 "오늘" 앵커는 그대로 유효.
- **과거 데이터 backfill 안 함**: 기존 행은 UTC 버킷으로 남아 전환 시점에 하루 정도 미세 경계 이동이 있으나, 일별 "최악 상태" 색상엔 사실상 영향 없어 비용 대비 무의미.

## 5. 검증 (이 저장소는 단위 테스트 러너 없이 Playwright E2E만 있음)

1. `npm run lint` + `npx tsc --noEmit` 타입 체크 통과.
2. 실 Supabase 재현 검증: 수정된 조회 로직으로 전체 1686행(특히 `2026-07-19`)이 반환되는지 확인.
3. `npm run dev`로 `/`, `/history` 로드 → 최근 날짜 채워짐 육안 확인.
4. (선택) `tests/app.spec.ts`에 "최신 날짜 셀이 비어있지 않다" 어서션 추가 — 라이브 데이터 의존이라 optional.

## 6. 변경 파일

- 신규: `src/lib/fetchAllRows.ts`
- 수정: `src/hooks/useServices.ts`, `src/app/history/page.tsx`, `src/lib/dateUtils.ts`, `scripts/health_check.py`

## 7. 범위 밖 (YAGNI)

RPC/View 전환, 과거 데이터 backfill, 리치 에러 UI, 뷰어 임의 타임존 완전 대응, 단위 테스트 프레임워크 도입.
