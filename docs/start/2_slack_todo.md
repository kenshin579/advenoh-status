# Slack SDK WebClient 전환 체크리스트

## Phase 1: Slack App 설정 ✅

### 1. Slack App 생성 및 Bot Token 발급

- [x] [Slack API](https://api.slack.com/apps) 접속
- [x] Create New App > From scratch 선택
- [x] App Name 입력 (예: "Advenoh Status Monitor")
- [x] Workspace 선택

### 2. Bot Token Scopes 설정

- [x] OAuth & Permissions 메뉴 이동
- [x] Bot Token Scopes 섹션에서 권한 추가:
  - [x] `chat:write` - 메시지 전송 권한
  - [x] `chat:write.public` - public 채널 전송 권한 (봇 참여 불필요)

### 3. Bot Token 발급 및 저장

- [x] Install to Workspace 버튼 클릭
- [x] 권한 승인
- [x] Bot User OAuth Token 복사 (`xoxb-`로 시작)
- [x] Token을 안전한 곳에 임시 저장

### 4. Slack 채널 ID 확인

- [x] Slack에서 알림 받을 채널 이동
- [x] 채널 이름 우클릭 > View channel details
- [x] 맨 하단의 채널 ID 복사 (예: `C12345678`)

---

## Phase 2: 로컬 환경 설정 ✅

### 5. 환경변수 설정 (~/.zshrc)

- [x] `~/.zshrc` 파일 열기
- [x] 기존 `ADVENOH_STATUS_SLACK_WEBHOOK_URL` 주석 처리 또는 삭제
- [x] 아래 환경변수 추가:
  ```bash
  export ADVENOH_STATUS_SLACK_BOT_TOKEN="xoxb-..."
  export ADVENOH_STATUS_SLACK_CHANNEL_ID="C12345678"
  ```
- [x] `source ~/.zshrc` 실행하여 환경변수 로드
- [x] `echo $ADVENOH_STATUS_SLACK_BOT_TOKEN`으로 확인

---

## Phase 3: 코드 수정 ✅

### 6. pyproject.toml 의존성 추가

- [x] `scripts/pyproject.toml` 파일 열기
- [x] `dependencies` 배열에 `"slack_sdk>=3.27.0"` 추가
- [x] `cd scripts && uv sync` 실행
- [x] `uv pip list | grep slack` 출력 확인

### 7. health_check.py 수정

#### Import 추가
- [x] `from slack_sdk import WebClient` 추가
- [x] `from slack_sdk.errors import SlackApiError` 추가

#### 환경변수 변경
- [x] 기존 `SLACK_WEBHOOK_URL` 변수 제거
- [x] `SLACK_BOT_TOKEN = os.environ.get("ADVENOH_STATUS_SLACK_BOT_TOKEN")` 추가
- [x] `SLACK_CHANNEL_ID = os.environ.get("ADVENOH_STATUS_SLACK_CHANNEL_ID")` 추가

#### send_slack_notification 함수 교체
- [x] 기존 함수 전체를 implementation.md의 새 함수로 교체
- [x] Block Kit blocks 구조 확인
- [x] SlackApiError 예외 처리 확인

---

## Phase 4: 로컬 테스트

### 8. 로컬 실행 테스트

- [ ] `cd scripts` 이동
- [ ] `source ~/.zshrc` 실행
- [ ] `uv run python health_check.py` 실행
- [ ] 콘솔 출력 확인:
  - [ ] "Slack notification sent for ..." 메시지 표시
  - [ ] SlackApiError 발생하지 않음

### 9. Slack 메시지 확인

- [ ] Slack 채널에서 메시지 수신 확인
- [ ] Block Kit 포맷 확인:
  - [ ] Header 블록: 이모지 + 상태 + 서비스명
  - [ ] Section 블록: URL, HTTP Status, Response Time, Message 필드
  - [ ] Context 블록: 타임스탬프
- [ ] 메시지 가독성 확인

---

## Phase 5: GitHub Actions 설정

### 10. GitHub Secrets 등록

- [ ] GitHub 저장소 > Settings > Secrets and variables > Actions 이동
- [ ] New repository secret 클릭
- [ ] `ADVENOH_STATUS_SLACK_BOT_TOKEN` 추가 (값: `xoxb-...`)
- [ ] New repository secret 클릭
- [ ] `ADVENOH_STATUS_SLACK_CHANNEL_ID` 추가 (값: `C12345678`)
- [ ] 기존 `ADVENOH_STATUS_SLACK_WEBHOOK_URL` secret 삭제 (선택사항)

### 11. 워크플로우 파일 수정

- [ ] `.github/workflows/health-check.yml` 파일 열기
- [ ] `env` 섹션에서 기존 `ADVENOH_STATUS_SLACK_WEBHOOK_URL` 제거
- [ ] 아래 두 줄 추가:
  ```yaml
  ADVENOH_STATUS_SLACK_BOT_TOKEN: ${{ secrets.ADVENOH_STATUS_SLACK_BOT_TOKEN }}
  ADVENOH_STATUS_SLACK_CHANNEL_ID: ${{ secrets.ADVENOH_STATUS_SLACK_CHANNEL_ID }}
  ```

---

## Phase 6: 배포 및 검증

### 12. 변경사항 커밋 및 푸시

- [ ] Git 변경사항 확인
- [ ] `git add` 실행:
  - [ ] `scripts/pyproject.toml`
  - [ ] `scripts/health_check.py`
  - [ ] `.github/workflows/health-check.yml`
- [ ] `git commit -m "feat: Slack SDK WebClient 전환"` 실행
- [ ] `git push` 실행

### 13. GitHub Actions 실행 확인

- [ ] GitHub Actions 탭에서 워크플로우 실행 확인
- [ ] 수동 실행: `gh workflow run health-check.yml` 또는 Actions 탭에서 Run workflow
- [ ] 워크플로우 로그 확인:
  - [ ] `uv sync` 성공
  - [ ] `slack_sdk` 설치 확인
  - [ ] "Slack notification sent for ..." 메시지 표시
- [ ] Slack 채널에서 메시지 수신 확인

### 14. 최종 검증

- [ ] 5분 간격으로 자동 실행되는지 확인 (다음 cron 주기 대기)
- [ ] 서비스 상태 변경 시 알림 정상 수신 확인
- [ ] Block Kit 메시지 포맷 정상 표시 확인

---

## Phase 7: 문서 정리

### 15. PRD 문서 이동

- [ ] `docs/start/2_slack_prd.md` → `docs/done/2_slack_prd.md`로 이동
- [ ] `docs/start/2_slack_implementation.md` → `docs/done/2_slack_implementation.md`로 이동
- [ ] `docs/start/2_slack_todo.md` → `docs/done/2_slack_todo.md`로 이동

---

## 트러블슈팅

### Slack API 에러 발생 시

- [ ] Token 값이 올바른지 확인 (`xoxb-`로 시작)
- [ ] Bot이 채널에 접근 권한이 있는지 확인
- [ ] `chat:write.public` scope 추가되었는지 확인

### 메시지가 전송되지 않을 때

- [ ] 환경변수 설정 확인: `echo $ADVENOH_STATUS_SLACK_BOT_TOKEN`
- [ ] 채널 ID가 올바른지 확인
- [ ] `uv pip list | grep slack` 출력에 `slack-sdk` 표시되는지 확인

### GitHub Actions에서 실패할 때

- [ ] Secrets 값이 올바르게 설정되었는지 확인
- [ ] 워크플로우 파일의 환경변수 이름 일치 확인
- [ ] Actions 로그에서 상세 에러 메시지 확인
