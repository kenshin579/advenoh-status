# 매번 INSERT 방식으로 되돌리기 Todo

## Phase 1: 코드 수정

### 1-1. `update_timestamp()` 함수 삭제
- [x] `scripts/health_check.py` Line 104-119 삭제
  - [x] `update_timestamp()` 함수 전체 제거

### 1-2. `main()` 함수 로직 수정
- [x] `scripts/health_check.py` Line 200-217 수정
  - [x] `if status_changed:` 분기 제거
  - [x] `save_result(result)` 항상 호출하도록 변경
  - [x] Slack 알림 조건 수정: `if status_changed and result.status in ("WARN", "ERROR"):`

## Phase 2: 로컬 테스트

### 2-1. 로컬 환경 설정
- [x] `.env` 파일에 환경변수 설정 확인
  - [x] `ADVENOH_STATUS_SUPABASE_URL`
  - [x] `ADVENOH_STATUS_SUPABASE_API_KEY`
  - [x] `ADVENOH_STATUS_SLACK_BOT_TOKEN` (선택)
  - [x] `ADVENOH_STATUS_SLACK_CHANNEL_ID` (선택)

### 2-2. Python 스크립트 실행 테스트
- [x] `cd scripts && uv run python health_check.py`
- [x] 실행 로그 확인: "Status saved to database" 메시지 출력 확인
- [x] Supabase DB 확인: 새 레코드 INSERT 되었는지 확인

### 2-3. 연속 실행 테스트 (동일 상태)
- [x] 동일 스크립트를 2-3회 연속 실행
- [x] DB에 매번 새 레코드가 INSERT 되는지 확인
- [x] timestamp가 각각 다른지 확인

## Phase 3: GitHub Actions 배포

### 3-1. 코드 커밋 및 푸시
- [ ] 변경 사항 커밋
  ```bash
  git add scripts/health_check.py
  git commit -m "feat: revert to always insert on every health check"
  git push origin <branch>
  ```

### 3-2. GitHub Actions 실행 확인
- [ ] GitHub Actions 워크플로우 수동 실행 또는 다음 cron 실행 대기
- [ ] Actions 로그에서 "Status saved to database" 확인
- [ ] Supabase DB에 새 레코드 생성 확인

## Phase 4: 프론트엔드 검증

### 4-1. 로컬 개발 서버 실행
- [ ] `npm run dev` 실행
- [ ] `http://localhost:3000` 접속 (또는 로그인 필요 시 로그인)

### 4-2. 90 Day Uptime 그래프 확인
- [ ] 90 Day Uptime Grid에서 "NONE" (No data) 표시 없는지 확인
- [ ] 최근 날짜들이 모두 OK/WARN/ERROR 상태로 표시되는지 확인

### 4-3. Monthly Calendar 확인
- [ ] 월별 캘린더에서 각 날짜의 상태 표시 확인
- [ ] Last checked 시간이 실시간으로 업데이트되는지 확인

## Phase 5: 프로덕션 배포 및 모니터링

### 5-1. 프로덕션 배포
- [ ] main 브랜치에 머지
- [ ] Netlify 자동 배포 완료 대기

### 5-2. 프로덕션 환경 검증
- [ ] 배포된 사이트에서 90 Day Uptime 그래프 확인
- [ ] 24시간 후 모든 날짜에 데이터가 쌓이는지 재확인

### 5-3. DB 용량 모니터링 (선택)
- [ ] Supabase 대시보드에서 테이블 row count 확인
- [ ] 예상 증가량: 하루 288개/서비스 (5분마다 INSERT)

## 완료 조건
- ✅ `update_timestamp()` 함수가 완전히 제거됨
- ✅ 매 health check마다 새 레코드가 INSERT됨
- ✅ 90 Day Uptime 그래프에 "No data" 표시 없음
- ✅ 상태 변경 시에만 Slack 알림 발송됨
