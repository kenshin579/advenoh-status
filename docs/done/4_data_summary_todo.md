# 일별 상태 요약 테이블 도입 - TODO

## 1단계: DB Migration
- [x] `supabase/migrations/006_create_daily_status_summary.sql` 파일 생성
- [x] Supabase SQL Editor에서 migration 실행
- [x] 기존 데이터로 summary 테이블 초기화 확인

## 2단계: Backend (health_check.py)
- [x] `update_daily_summary()` 함수 추가
- [x] `main()` 함수에서 `update_daily_summary()` 호출 추가
- [ ] 로컬 테스트: `uv run python health_check.py`
- [ ] GitHub Actions에서 정상 동작 확인

## 3단계: Frontend 타입 정의
- [x] `src/types/index.ts`에 `DailyStatusSummary` 타입 추가

## 4단계: Frontend Hook 수정
- [x] `src/hooks/useServices.ts` - `useUptimeData()` 수정
  - [x] `daily_status_summary` 테이블 조회로 변경
  - [x] `summaryByDate` Map 반환하도록 변경

## 5단계: Frontend 컴포넌트 수정
- [x] `src/components/UptimeGrid.tsx` - summary 데이터 사용
- [x] `src/components/MonthlyCalendar.tsx` - summary 데이터 사용
- [x] `src/components/DayDetailPanel.tsx` - summary 데이터 표시
- [x] `src/app/page.tsx` - props 수정
- [x] `src/app/history/page.tsx` - props 수정

## 6단계: 테스트 (MCP Playwright 사용)
- [x] Dashboard 페이지 접속
  - [x] 90일 Uptime 그리드에 과거 데이터 표시 확인
- [x] History 페이지 접속
  - [x] 월별 캘린더에 과거 데이터 표시 확인
  - [x] 날짜 클릭 시 상세 정보 표시 확인 (OK/WARN/ERROR 카운트, 평균 응답시간)
- [ ] 서비스 삭제 테스트 (수동 테스트 필요)
  - [ ] CASCADE로 summary 데이터도 삭제되는지 확인
