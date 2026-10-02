# 9. 다운 알림 이메일 + 감지 주기 개선 (설계)

- 작성일: 2026-10-02
- 브랜치: `feat/down-alert-email`
- 유형: 기능 추가 + 버그 수정
- 구성: **1단계**(감지 주기 + 조회 수정) → **2단계**(다운/복구 알림 Telegram + 이메일). 단계별 PR 1개씩.

## 1. 배경

서비스가 다운되면 이메일로 알림을 받고 싶다. 현황을 조사하다가 이메일 채널보다 먼저 손봐야 할 문제 두 가지를 확인했다.

### 1.1 체크가 몇 시간 간격으로만 돈다 (실측)

`health-check.yml`의 cron은 `0 * * * *`(매시 정각)인데, 최근 schedule 실행 기록은 다음과 같다(UTC).

```
09/30  00:51 → 06:07 → 13:08 → 18:40 → 22:42
10/01  01:40 → 07:58 → 15:06 → 20:38
```

하루 24회가 아니라 **4~6회, 3~7시간 간격**으로만 실행된다. GitHub 문서에 따르면 schedule 이벤트는 부하가 클 때 지연되거나 드롭되며, 부하는 **매시 정각**에 가장 크다. 이 상태에서는 알림 채널을 무엇으로 바꾸든 다운 감지가 몇 시간 늦는다.

### 1.2 체크 빈도를 올리면 대시보드가 1000행 제한에 걸린다

`health_check.py`는 체크할 때마다 `service_status_logs`에 한 행씩 INSERT한다. 그런데 두 hook이 이 테이블을 페이지네이션 없이 조회한다. Supabase는 서버에서 Max Rows를 1000으로 강제한다(#49, `2026-07-19-uptime-truncation-design.md` 참조).

| hook | 조회 범위 | 현재(하루 약 5회 실행) | 15분 간격 적용 시 |
|---|---|---|---|
| `useIncidents(14)` (Dashboard) | 15개 서비스 × 14일 | 약 1,050행 (이미 한계) | 약 20,000행 → service_id 순으로 잘려 대부분 서비스의 incident 누락 |
| `useResponseTrace(id, 30)` (ServiceCard) | 서비스 1개 × 30일 | 약 150행 | 약 2,900행 → 오름차순이라 **최근 날짜가 잘림** |

지금 이 문제가 드러나지 않은 건 GitHub이 schedule 실행 대부분을 드롭해 왔기 때문이다. 그래서 주기를 바꾸는 작업과 조회를 고치는 작업은 반드시 함께 배포해야 한다.

### 1.3 현재 알림 동작

- 상태가 바뀌었을 때 WARN 또는 ERROR면 Telegram으로 알린다.
- 복구 알림은 없다.
- 일시적 오류를 거르는 장치가 없다.
- 발송 실패는 `print`만 남기고, 워크플로는 성공으로 끝난다.
- Telegram 메시지의 시각은 `time.strftime("... KST")`로 만든다. runner가 UTC라서 **UTC 시각에 "KST" 라벨이 붙어** 나간다(버그).

## 2. 결정 사항

| 항목 | 결정 |
|---|---|
| 감지 방식 | GitHub Actions schedule 유지, **정각을 피한 15분 간격** (`7-59/15 * * * *`) |
| 주기가 개선되지 않을 때 | 이번 범위 밖. 외부 cron이 `workflow_dispatch`를 호출하는 방식으로 전환 검토 |
| 알림 대상 상태 | **ERROR만**. WARN은 Telegram과 이메일 모두 보내지 않음(대시보드에서만 확인) |
| 채널 | Telegram + 이메일 **병행** (같은 이벤트를 두 채널로 보냄) |
| 이메일 발송 | Gmail SMTP (`smtp.gmail.com:587`, STARTTLS) + 앱 비밀번호, Python 표준 `smtplib` |
| 발신 / 수신 | `advenoh@gmail.com` → `advenoh@gmail.com` |
| 복구 알림 | 보냄 (다운 지속 시간 포함) |
| 오탐 방지 | **ERROR가 연속 2회** 나와야 다운 알림. 다운 알림은 최대 약 30분 뒤에 도착 |
| 민감 정보 | 모두 GitHub Secret으로 관리. 코드와 문서에는 값을 넣지 않음 |

## 3. 1단계: 감지 주기 개선 + 조회 수정

### 3.1 cron 변경

`.github/workflows/health-check.yml`:

```yaml
on:
  schedule:
    # 매시 정각은 GitHub Actions 부하가 몰려 schedule 이 지연·드롭된다(실측: 하루 4~6회만 실행).
    # 정각을 피해 7,22,37,52분에 15분 간격으로 실행한다.
    - cron: '7-59/15 * * * *'
```

### 3.2 `useResponseTrace`를 `daily_status_summary`로 전환

`src/hooks/useResponseTrace.ts`는 지금 `service_status_logs`에서 30일치를 받아 클라이언트에서 일별 평균을 낸다. 이걸 `daily_status_summary`의 `date, avg_response_time`을 직접 읽는 방식으로 바꾼다(서비스당 최대 30행).

- 의미는 같다. summary의 `avg_response_time`도 모든 체크(ERROR 포함)의 응답 시간 평균이고, 날짜 버킷도 둘 다 KST다(#49에서 정합 완료).
- 결과 형태(`ResponseTracePoint[]`, 데이터가 없는 날은 빈 포인트)와 30일 루프는 유지한다.

### 3.3 `useIncidents`를 상태 전환 RPC로 전환

**migration** `supabase/migrations/007_status_transitions_fn.sql`:

```sql
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
```

- `SECURITY INVOKER`이므로 기존 "Public read access for logs/services" 정책이 그대로 적용된다(anon도 읽을 수 있음).
- 기존 인덱스 `idx_logs_service_timestamp`를 활용한다.

**프론트엔드**:
- `supabase.rpc('get_status_transitions', { since })`를 기존 `fetchAllRows` 헬퍼로 감싸 페이지네이션한다.
  - 전환만 받으면 보통 수십 행이지만, 응답 시간이 threshold 근처에서 OK와 WARN을 오가는 서비스는 14일에 1000행을 넘을 수 있다.
  - 안정적인 페이지네이션을 위해 함수가 `ORDER BY ... id`로 순서를 고정한다.
- 반환 필드에 맞춰 `RawLog` 타입을 고친다(`services.name` → `service_name`).
- incident 계산 로직(처음 bad 행에서 incident를 열고, worst status를 갱신하고, OK에서 닫음)은 **바꾸지 않는다**. incident 경계는 정의상 상태 전환 지점이고, WARN→ERROR 같은 전환도 포함되므로 결과가 같다.

### 3.4 배포 순서 (PR 설명에 명시)

1. Supabase에 migration 007 적용(SQL editor에서 수동 실행)
2. PR merge → Netlify에서 프론트엔드 자동 배포 + cron 변경 적용

migration이 적용되지 않은 상태에서 프론트엔드가 배포되면 RPC 호출이 실패해 incident 목록이 빈다. 그래서 반드시 **merge 전에** migration을 적용한다.

### 3.5 문서 정정

`CLAUDE.md`의 틀린 설명을 고친다.
- "5min cron" → "15min cron (정각 회피)"
- "Status changes are stored only when different"(실제로는 매번 INSERT)
- 001 스키마 주석 "변경 시에만 저장"은 migration 파일이므로 수정하지 않는다.

### 3.6 검증

- `npm run lint`, `npm run check`(tsc), `npm run build`
- Playwright E2E(`tests/app.spec.ts`) 통과
- **동등성 확인**: 운영 DB에서 기존 방식(로그 전체를 읽어 계산)과 RPC 방식의 incident 목록이 같은지 일회성 스크립트로 비교. 기존 방식은 1000행 잘림이 없도록 `fetchAllRows`로 읽는다.
- 배포 후 1~2일 동안 `gh run list --workflow=health-check.yml --event schedule`로 실행 간격 관찰. 15분 간격이 대체로 지켜지면 완료로 본다.

## 4. 2단계: 다운/복구 알림 (Telegram + 이메일)

### 4.1 알림 판단: `decide_alert` (순수 함수)

이번 체크 결과를 INSERT하기 **전에**, 같은 서비스의 직전 로그 2개 상태를 시간 역순으로 조회한다(`prev1`, `prev2`, 없으면 `None`).

```python
def decide_alert(current: str, prev1: str | None, prev2: str | None) -> Literal["DOWN", "RECOVERED"] | None
```

| current | prev1 | prev2 | 결과 |
|---|---|---|---|
| ERROR | ERROR | ERROR 아님 / None | **DOWN** |
| OK 또는 WARN | ERROR | ERROR | **RECOVERED** |
| 그 밖의 모든 경우 | | | None |

| 시나리오 (오래된 것 → 최신) | 알림 |
|---|---|
| OK, ERROR, OK | 없음 (단발 ERROR는 무시) |
| OK, ERROR, ERROR | DOWN (2번째 ERROR 시점) |
| ERROR, ERROR, ERROR | 없음 (이미 알림 보냄) |
| ERROR, ERROR, OK | RECOVERED |
| ERROR, ERROR, WARN | RECOVERED (ERROR가 아니면 복구로 봄) |
| (로그 없음), ERROR, ERROR | DOWN |
| ERROR, OK, ERROR, OK | 없음 (튀는 상태는 무시) |

DOWN 없이 RECOVERED가 오는 경우는 없다. RECOVERED는 직전 2회가 ERROR일 때만 발생하고, 그 2회 중 2번째 시점에 DOWN이 이미 나갔기 때문이다.

### 4.2 다운 지속 시간 (RECOVERED에만 사용)

1. `prev_ok_ts`: 이번 결과를 INSERT하기 전에, 해당 서비스에서 status ≠ ERROR인 가장 최근 로그의 timestamp(없으면 None)
2. `down_since`: `prev_ok_ts` 이후 첫 ERROR 로그의 timestamp(`prev_ok_ts`가 None이면 그 서비스의 첫 ERROR 로그)
3. 지속 시간 = 현재 시각 − `down_since`, 분 단위로 반올림

실제 다운은 `down_since` 직전 체크와 `down_since` 사이에 시작됐으므로, 이 값은 최대 15분 과소 추정될 수 있다. 메시지에는 "약 N분"으로 표기한다.

### 4.3 파일 구조

| 파일 | 책임 |
|---|---|
| `scripts/health_check.py` | 체크(`check_service`), 저장, 직전 상태 조회, `decide_alert` 호출, 종료 코드 결정 |
| `scripts/notifier.py` (신규) | `decide_alert`, `AlertEvent` 데이터 클래스, 메시지 생성(Telegram MarkdownV2 / 이메일 제목·본문), `send_telegram`, `send_email` |
| `scripts/tests/` (신규) | 단위 테스트: `test_decide.py`, `test_messages.py`, `test_email.py`, `test_telegram.py`, `test_health_check.py` |

- `notifier.py`는 Supabase에 의존하지 않는다. 판단과 발송을 따로 테스트할 수 있게 하기 위해서다.
- 두 채널은 독립적이다. 한쪽에서 예외가 나도 다른 쪽은 시도한다.
- 각 `send_*`는 성공 여부(`bool`)를 반환하고, 설정이 없으면 `None`(건너뜀)을 반환한다.

### 4.4 메시지 형식

**이메일** (plain text, UTF-8):

```
제목: [advenoh-status] 🔴 DOWN: Moneyflow
제목: [advenoh-status] 🟢 RECOVERED: Moneyflow (약 32분 다운)

본문:
서비스: Moneyflow
상태: DOWN (ERROR 2회 연속)        | RECOVERED (현재 OK)
URL: https://moneyflow.advenoh.pe.kr
HTTP Status: 502                    | (없으면 N/A)
Response Time: 1234ms
Message: <에러 메시지>              | (없으면 -)
다운 시작: 2026-10-02 14:07 KST      | (RECOVERED에만)
시각: 2026-10-02 14:37:12 KST

대시보드: https://status.advenoh.pe.kr
```

**Telegram**: 같은 정보를 기존 MarkdownV2 형식(`escape_markdown`)으로 보낸다. 이모지는 DOWN 🔴, RECOVERED 🟢.

**시각 버그 수정**: 모든 시각은 `datetime.now(KST)`로 만든다. `time.strftime`은 제거한다.

### 4.5 이메일 발송

```python
with smtplib.SMTP(host, port, timeout=10) as smtp:
    smtp.starttls()
    smtp.login(user, password)
    smtp.send_message(msg)   # email.message.EmailMessage, From=user, To=ALERT_EMAIL_TO
```

- `ALERT_EMAIL_TO`는 쉼표로 구분해 여러 주소를 받을 수 있다(지금은 1개).
- SMTP 설정 5개 중 하나라도 비어 있으면 건너뛴다(Telegram과 같은 방식).

### 4.6 발송 실패 감지

- 실행 중 발송이 한 번이라도 **실패**하면(건너뜀은 제외), 모든 서비스의 체크와 저장을 마친 뒤 `sys.exit(1)`로 끝낸다.
- 그러면 GitHub이 워크플로 실패 알림 메일을 보낸다. 앱 비밀번호 만료나 봇 토큰 폐기 같은 알림 경로 고장이 조용히 묻히지 않게 하기 위해서다.
- 직전 상태 조회 실패와 DB 저장 실패도 run 실패(exit 1)로 처리한다. 알림 상태를 로그 이력으로 계산하기 때문에, 이력이 어긋나면 DOWN/RECOVERED가 누락되거나 중복된다. 직전 상태를 읽지 못한 서비스는 저장도 건너뛰고(다음 run에서 한 번 늦게라도 DOWN이 나가도록), 나머지 서비스는 계속 체크한다.
- SMTP STARTTLS는 `ssl.create_default_context()`로 인증서와 호스트명을 검증한다(기본값은 검증하지 않음).

### 4.7 설정

**GitHub Secrets (신규 5개)**: 값은 구현할 때 `gh secret set`으로 등록하며, 이 문서에는 기록하지 않는다.

| Secret | 용도 |
|---|---|
| `ADVENOH_STATUS_SMTP_HOST` | `smtp.gmail.com` |
| `ADVENOH_STATUS_SMTP_PORT` | `587` |
| `ADVENOH_STATUS_SMTP_USER` | 발신 계정 (`advenoh@gmail.com`) |
| `ADVENOH_STATUS_SMTP_PASSWORD` | Gmail 앱 비밀번호 |
| `ADVENOH_STATUS_ALERT_EMAIL_TO` | 수신 주소 (`advenoh@gmail.com`) |

**워크플로**:
- 위 5개를 `env`로 넘긴다.
- `workflow_dispatch`에 boolean input `test_notify`를 추가한다. true면 `health_check.py --test-notify`로 실행하는데, 이 모드는 헬스체크 없이 두 채널로 테스트 메시지 1건을 보내고 결과에 따라 종료 코드를 정한다.

### 4.8 테스트

- `scripts/pyproject.toml`에 dev 의존성 `pytest`를 추가하고 `uv run pytest`로 실행한다.
- `decide_alert`: 4.1의 시나리오 표 전부를 단위 테스트로 확인한다.
- 다운 지속 시간 계산: 판단 로직을 시각 인자를 받는 순수 함수로 분리해서 테스트한다.
- 메시지 생성: DOWN/RECOVERED 제목·본문 필드, KST 표기, MarkdownV2 이스케이프.
- `send_email`: `smtplib.SMTP`를 mock해서 starttls, login, send_message 호출과 From/To/Subject를 확인한다. 설정이 없으면 None을 반환하는지도 확인한다.
- 워크플로에 `uv run pytest` 단계를 추가하지는 않는다(헬스체크 cron과 분리). 로컬과 PR에서 실행한다.
- **실발송 확인**: merge 후 `gh workflow run health-check.yml -f test_notify=true`로 실행하고, Telegram과 `advenoh@gmail.com` 받은편지함(스팸함 아님)에 도착했는지 확인한다.

### 4.9 문서

- `CLAUDE.md`: Architecture 다이어그램에 Email 추가, 알림 규칙(ERROR 2회 연속 → DOWN, 복구 → RECOVERED, WARN은 알림 없음), Secrets 목록 갱신.
- `scripts/README.md`: 환경변수, 테스트 실행 방법.

## 5. 범위 밖

- 외부 cron → `workflow_dispatch` 전환 (1단계 관찰 결과에 따라 별도로 진행)
- `service_status_logs` 보존 기간 정리 (15분 간격 기준 연간 약 53만 행. Supabase 무료 플랜 용량 안에서 당분간 문제없음)
- 서비스별 알림 on/off, 수신자 관리 UI
- DB 저장 실패 알림
