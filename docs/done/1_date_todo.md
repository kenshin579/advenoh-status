# 날짜 표시 오류 수정 - Todo 체크리스트

## Phase 1: 유틸리티 함수 생성

- [x] `src/lib/dateUtils.ts` 파일 생성
- [x] `toLocalDateString()` 함수 구현

## Phase 2: 컴포넌트 수정

- [x] `src/components/MonthlyCalendar.tsx` 수정
  - [x] `toLocalDateString` import 추가
  - [x] `getDailyStatus()` 함수 내 날짜 비교 로직 변경
- [x] `src/components/UptimeGrid.tsx` 수정
  - [x] `toLocalDateString` import 추가
  - [x] `getDailyStatus()` 함수 내 날짜 비교 로직 변경

## Phase 3: 테스트

- [x] `npm run build` 빌드 성공 확인
- [x] `npm run lint` 린트 통과 확인
- [x] 로컬에서 Dashboard 페이지 확인 (90 Day Uptime 그리드)
- [x] 로컬에서 History 페이지 확인 (월별 캘린더)
- [x] MCP Playwright로 시각적 검증
  - [x] Dashboard: 오늘 날짜 칸에 오늘 데이터 표시 확인
  - [x] History: 오늘 날짜 칸에 오늘 데이터 표시 확인
