# 대시보드 로딩 속도 개선 TODO

## 1단계: N+1 쿼리 제거

- [ ] `src/hooks/useServices.ts` - `useServices()` 함수 수정
  - [ ] 기존 N+1 쿼리 패턴 제거
  - [ ] 단일 JOIN 쿼리로 변경 (services + service_status_logs)
  - [ ] 데이터 변환 로직 추가

## 2단계: 날짜 인덱스 사전 처리

- [ ] `src/hooks/useServices.ts` - `useUptimeData()` 함수 수정
  - [ ] `logsByDate` Map 상태 추가
  - [ ] fetch 후 날짜별 Map 구조로 변환
  - [ ] `logsByDate` 반환값에 추가

## 3단계: 컴포넌트 수정

- [ ] `src/components/UptimeGrid.tsx`
  - [ ] Props에 `logsByDate` 추가
  - [ ] `getDailyStatus()` 함수를 Map 기반 O(1) 조회로 변경

- [ ] `src/components/MonthlyCalendar.tsx`
  - [ ] Props에 `logsByDate` 추가
  - [ ] `getDailyStatus()` 함수를 Map 기반 O(1) 조회로 변경

- [ ] `src/components/DayDetailPanel.tsx`
  - [ ] Props에 `logsByDate` 추가
  - [ ] 날짜별 로그 조회를 Map 기반으로 변경

## 4단계: 페이지 컴포넌트 연결

- [ ] `src/app/page.tsx`
  - [ ] `useUptimeData()`에서 `logsByDate` 추출
  - [ ] `UptimeGrid`에 `logsByDate` props 전달

- [ ] `src/app/history/page.tsx`
  - [ ] `useUptimeData()`에서 `logsByDate` 추출
  - [ ] `MonthlyCalendar`, `DayDetailPanel`에 `logsByDate` props 전달

## 5단계: 테스트

- [ ] 로컬 개발 서버 실행 (`npm run dev`)
- [ ] MCP Playwright로 대시보드 페이지 테스트
  - [ ] 페이지 로딩 확인
  - [ ] 90 Day Uptime 그리드 표시 확인
  - [ ] 서비스 상태 표시 확인
- [ ] MCP Playwright로 History 페이지 테스트
  - [ ] 페이지 로딩 확인
  - [ ] 캘린더 표시 확인
  - [ ] 날짜 클릭 시 상세 정보 표시 확인
- [ ] 빌드 테스트 (`npm run build`)
- [ ] 린트 확인 (`npm run lint`)
