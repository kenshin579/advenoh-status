# Slack → Telegram 알림 전환 체크리스트

## Phase 1: Telegram Bot 설정

### 1. Bot 생성 및 Token 발급

- [x] Telegram에서 [@BotFather](https://t.me/BotFather) 대화 시작
- [x] `/newbot` 명령어 입력
- [x] Bot 이름 입력 (예: "Advenoh Status Monitor")
- [x] Bot username 입력 (예: `advenoh_status_bot`)
- [x] 발급된 Bot Token 저장 (형식: `123456789:ABCdefGHI...`)

### 2. Chat ID 확인

- [x] Bot과 대화 시작 (또는 그룹/채널에 Bot 추가)
- [x] `https://api.telegram.org/bot{TOKEN}/getUpdates` 접속
- [x] 응답 JSON에서 `chat.id` 값 확인 및 저장

---

## Phase 2: 로컬 환경 설정

### 3. 환경변수 설정 (~/.zshrc)

- [x] `~/.zshrc` 파일 열기
- [x] 기존 Slack 환경변수 주석 처리 또는 삭제:
  ```bash
  # export ADVENOH_STATUS_SLACK_BOT_TOKEN="xoxb-..."
  # export ADVENOH_STATUS_SLACK_CHANNEL_ID="C12345678"
  ```
- [x] Telegram 환경변수 추가:
  ```bash
  export ADVENOH_STATUS_TELEGRAM_BOT_TOKEN="123456789:ABCdefGHI..."
  export ADVENOH_STATUS_TELEGRAM_CHAT_ID="-1001234567890"
  ```
- [x] `source ~/.zshrc` 실행하여 환경변수 로드
- [x] `echo $ADVENOH_STATUS_TELEGRAM_BOT_TOKEN`으로 확인

---

## Phase 3: 코드 수정

### 4. pyproject.toml 의존성 제거

- [x] `scripts/pyproject.toml` 파일 열기
- [x] `dependencies`에서 `"slack_sdk>=3.27.0"` 제거
- [x] `cd scripts && uv sync` 실행
- [x] `uv pip list | grep slack`으로 제거 확인

### 5. health_check.py 수정

#### Import 변경
- [x] `from slack_sdk import WebClient` 제거
- [x] `from slack_sdk.errors import SlackApiError` 제거

#### 환경변수 변경
- [x] 기존 `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` 변수 제거
- [x] `TELEGRAM_BOT_TOKEN = os.environ.get("ADVENOH_STATUS_TELEGRAM_BOT_TOKEN")` 추가
- [x] `TELEGRAM_CHAT_ID = os.environ.get("ADVENOH_STATUS_TELEGRAM_CHAT_ID")` 추가

#### 함수 구현
- [x] `escape_markdown()` 함수 추가
- [x] `send_slack_notification()` 함수를 `send_telegram_notification()`으로 교체
- [x] `main()` 함수에서 호출 부분 변경: `send_slack_notification` → `send_telegram_notification`

---

## Phase 4: 로컬 테스트

### 6. 로컬 실행 테스트

- [x] `cd scripts` 이동
- [x] `source ~/.zshrc` 실행
- [x] `uv run python health_check.py` 실행
- [x] 콘솔 출력 확인:
  - [x] "Telegram notification sent for ..." 메시지 표시
  - [x] API 에러 없음

### 7. Telegram 메시지 확인

- [x] Telegram에서 메시지 수신 확인
- [x] MarkdownV2 포맷 확인:
  - [x] 상태 이모지 (🔴/🟡) 표시
  - [x] 볼드 텍스트 정상 표시
  - [x] URL, HTTP Status, Response Time, Message 필드 표시
  - [x] 타임스탬프 표시
- [x] 특수문자 이스케이프 정상 동작 확인

---

## Phase 5: GitHub Actions 설정

### 8. GitHub Secrets 등록

- [x] GitHub 저장소 > Settings > Secrets and variables > Actions 이동
- [x] `ADVENOH_STATUS_TELEGRAM_BOT_TOKEN` 추가
- [x] `ADVENOH_STATUS_TELEGRAM_CHAT_ID` 추가
- [x] 기존 `ADVENOH_STATUS_SLACK_BOT_TOKEN` 삭제
- [x] 기존 `ADVENOH_STATUS_SLACK_CHANNEL_ID` 삭제

### 9. 워크플로우 파일 수정

- [x] `.github/workflows/health-check.yml` 파일 열기
- [x] `env` 섹션에서 Slack 환경변수 2개 제거
- [x] Telegram 환경변수 2개 추가:
  ```yaml
  ADVENOH_STATUS_TELEGRAM_BOT_TOKEN: ${{ secrets.ADVENOH_STATUS_TELEGRAM_BOT_TOKEN }}
  ADVENOH_STATUS_TELEGRAM_CHAT_ID: ${{ secrets.ADVENOH_STATUS_TELEGRAM_CHAT_ID }}
  ```

---

## Phase 6: 문서 업데이트

### 10. CLAUDE.md 업데이트

- [x] GitHub Actions Secrets 섹션:
  - [x] `ADVENOH_STATUS_SLACK_BOT_TOKEN` → `ADVENOH_STATUS_TELEGRAM_BOT_TOKEN`
  - [x] `ADVENOH_STATUS_SLACK_CHANNEL_ID` → `ADVENOH_STATUS_TELEGRAM_CHAT_ID`
- [x] Architecture 다이어그램: `Slack Webhook` → `Telegram Bot`

### 11. README.md 업데이트

- [x] 아키텍처 설명에서 Slack → Telegram 변경

---

## Phase 7: 배포 및 검증

### 12. 변경사항 커밋 및 푸시

- [ ] Git 변경사항 확인
- [ ] 변경 파일 `git add`:
  - [ ] `scripts/health_check.py`
  - [ ] `scripts/pyproject.toml`
  - [ ] `.github/workflows/health-check.yml`
  - [ ] `CLAUDE.md`
  - [ ] `README.md`
- [ ] 커밋 및 PR 생성

### 13. GitHub Actions 실행 확인

- [ ] 수동 실행: Actions 탭에서 Run workflow
- [ ] 워크플로우 로그 확인:
  - [ ] `uv sync` 성공 (`slack_sdk` 미포함)
  - [ ] health check 실행 성공
  - [ ] "Telegram notification sent for ..." 메시지 표시
- [ ] Telegram에서 메시지 수신 확인

### 14. 최종 검증

- [ ] cron 주기에 따라 자동 실행 확인
- [ ] 서비스 상태 변경 시 Telegram 알림 정상 수신 확인
- [ ] MarkdownV2 포맷 정상 표시 확인

---

## Phase 8: 문서 정리

### 15. 완료된 문서 이동

- [ ] `docs/start/2_telegram_prd.md` → `docs/done/2_telegram_prd.md`
- [ ] `docs/start/2_telegram_implementation.md` → `docs/done/2_telegram_implementation.md`
- [ ] `docs/start/2_telegram_todo.md` → `docs/done/2_telegram_todo.md`

---

## 트러블슈팅

### Telegram API 에러 발생 시

- [ ] Bot Token 형식 확인 (`숫자:문자열`)
- [ ] Chat ID가 올바른지 확인 (그룹은 `-` 접두사)
- [ ] Bot이 채팅/그룹에 추가되었는지 확인

### MarkdownV2 파싱 에러 시

- [ ] 특수문자 이스케이프 확인 (`_*[]()~`>#+-=|{}.!`)
- [ ] `escape_markdown()` 함수가 모든 필드에 적용되었는지 확인

### GitHub Actions에서 실패할 때

- [ ] Secrets 값이 올바르게 설정되었는지 확인
- [ ] 워크플로우 파일의 환경변수 이름 일치 확인
- [ ] Actions 로그에서 상세 에러 메시지 확인
