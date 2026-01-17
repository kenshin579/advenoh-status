# 서비스 삭제 시 데이터 정합성 개선 - TODO

## 1단계: Migration 파일 생성
- [x] `supabase/migrations/005_cascade_delete_service_logs.sql` 파일 생성
- [x] orphan 로그 삭제 SQL 작성
- [x] CASCADE DELETE 외래 키 재생성 SQL 작성

## 2단계: DB 적용
- [ ] Supabase SQL Editor에서 마이그레이션 실행
- [ ] 실행 결과 확인 (에러 없음)

## 3단계: 테스트 (MCP Playwright 사용)
- [ ] orphan 로그 삭제 확인: `SELECT COUNT(*) FROM service_status_logs WHERE service_id NOT IN (SELECT id FROM services);` → 0
- [ ] Dashboard 페이지 확인: 90일 업타임 그리드에 데이터 정상 표시
- [ ] History 페이지 확인: 월별 캘린더에 데이터 정상 표시
- [ ] 서비스 삭제 테스트: 서비스 삭제 시 관련 로그 자동 삭제 확인
