# Last Checked 시간 업데이트 Todo

## Phase 1: DB 스키마 변경

- [ ] `supabase/migrations/002_add_last_checked_at.sql` 파일 생성
- [ ] Supabase Dashboard에서 마이그레이션 SQL 실행
  - `services` 테이블에 `last_checked_at` 컬럼 추가
  - 기존 데이터 초기화 (service_status_logs 최신 timestamp 복사)

## Phase 2: Python 스크립트 수정

- [ ] `scripts/health_check.py` 수정
  - [ ] `datetime` import 추가
  - [ ] `update_last_checked()` 함수 추가
  - [ ] `main()` 함수에서 매 체크마다 `update_last_checked()` 호출

## Phase 3: 프론트엔드 수정

- [ ] `src/types/index.ts` 수정
  - [ ] `Service` 인터페이스에 `last_checked_at: string | null` 추가
- [ ] `src/hooks/useServices.ts` 수정
  - [ ] `lastChecked`를 `service.last_checked_at`에서 가져오도록 변경

## Phase 4: 테스트

- [ ] 로컬에서 health_check.py 실행하여 DB 업데이트 확인
- [ ] `npm run dev`로 프론트엔드 확인
- [ ] MCP Playwright로 UI 테스트
  - [ ] Last checked 시간이 정상 표시되는지 확인
- [ ] GitHub Actions에서 health check 실행 후 시간 갱신 확인
