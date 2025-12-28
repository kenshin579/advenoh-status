# 대시보드 로딩 속도 개선 TODO

## 1단계: N+1 쿼리 제거

- [x] `src/hooks/useServices.ts` - `useServices()` 함수 수정
  - [x] 기존 N+1 쿼리 패턴 제거
  - [x] 단일 JOIN 쿼리로 변경 (services + service_status_logs)
  - [x] 데이터 변환 로직 추가

## 2단계: 날짜 인덱스 사전 처리

- [x] `src/hooks/useServices.ts` - `useUptimeData()` 함수 수정
  - [x] `logsByDate` Map 상태 추가
  - [x] fetch 후 날짜별 Map 구조로 변환
  - [x] `logsByDate` 반환값에 추가

## 3단계: 컴포넌트 수정

- [x] `src/components/UptimeGrid.tsx`
  - [x] Props에 `logsByDate` 추가
  - [x] `getDailyStatus()` 함수를 Map 기반 O(1) 조회로 변경

- [x] `src/components/MonthlyCalendar.tsx`
  - [x] Props에 `logsByDate` 추가
  - [x] `getDailyStatus()` 함수를 Map 기반 O(1) 조회로 변경

- [x] `src/components/DayDetailPanel.tsx`
  - [x] Props에 `logsByDate` 추가
  - [x] 날짜별 로그 조회를 Map 기반으로 변경

## 4단계: 페이지 컴포넌트 연결

- [x] `src/app/page.tsx`
  - [x] `useUptimeData()`에서 `logsByDate` 추출
  - [x] `UptimeGrid`에 `logsByDate` props 전달

- [x] `src/app/history/page.tsx`
  - [x] `useUptimeData()`에서 `logsByDate` 추출
  - [x] `MonthlyCalendar`, `DayDetailPanel`에 `logsByDate` props 전달

## 5단계: 테스트

- [x] 로컬 개발 서버 실행 (`npm run dev`)
- [x] MCP Playwright로 대시보드 페이지 테스트
  - [x] 페이지 로딩 확인
  - [x] 90 Day Uptime 그리드 표시 확인
  - [x] 서비스 상태 표시 확인
- [x] MCP Playwright로 History 페이지 테스트
  - [x] 페이지 로딩 확인
  - [x] 캘린더 표시 확인
  - [x] 날짜 클릭 시 상세 정보 표시 확인
- [x] 빌드 테스트 (`npm run build`)
- [ ] 린트 확인 (`npm run lint`) - ESLint 설정 문제로 스킵
