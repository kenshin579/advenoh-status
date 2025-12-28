# Dashboard/History 데이터 미표시 버그 수정 - TODO

## 1단계: 코드 수정

- [x] `src/lib/dateUtils.ts`에 `parseTimestamp` 함수 추가
- [x] `src/components/UptimeGrid.tsx` 수정
  - [x] `parseTimestamp` import 추가
  - [x] `getDailyStatus` 함수에서 `new Date(log.timestamp)` → `parseTimestamp(log.timestamp)` 변경
- [x] `src/components/MonthlyCalendar.tsx` 수정
  - [x] `parseTimestamp` import 추가
  - [x] `getDailyStatus` 함수에서 `new Date(log.timestamp)` → `parseTimestamp(log.timestamp)` 변경
- [x] `src/components/DayDetailPanel.tsx` 확인 및 수정 (필요 시)

## 2단계: 로컬 테스트

- [x] `npm run dev`로 개발 서버 실행
- [x] Dashboard 페이지 확인
  - [x] 90 Day Uptime 그리드에서 12/27, 28 데이터 표시 확인
- [x] History 페이지 확인
  - [x] 캘린더에서 12/27, 28 날짜 색상 표시 확인
  - [x] 날짜 클릭 시 상세 정보 표시 확인

## 3단계: MCP Playwright 테스트

- [x] Dashboard 페이지 스크린샷 캡처
- [x] History 페이지 스크린샷 캡처
- [x] 12/27, 28 날짜에 데이터 색상(OK/WARN/ERROR) 표시 확인

## 4단계: 빌드 및 배포

- [x] `npm run build` 성공 확인
- [x] `npm run lint` 에러 없음 확인
- [x] 커밋 및 PR 생성
