# Last Checked 시간 업데이트 Todo

## Phase 1: Python 스크립트 수정

- [x] `scripts/health_check.py` 수정
  - [x] `from datetime import datetime, timezone` import 추가
  - [x] `update_timestamp()` 함수 추가
  - [x] `main()` 함수에서 상태 동일 시 `update_timestamp()` 호출

## Phase 2: 테스트

- [x] 로컬에서 health_check.py 실행
  - [x] 상태 변경 시 INSERT 확인
  - [x] 상태 동일 시 timestamp UPDATE 확인
- [ ] MCP Playwright로 UI 테스트
  - [ ] Last checked 시간이 정상 갱신되는지 확인
- [ ] GitHub Actions에서 health check 실행 후 시간 갱신 확인
