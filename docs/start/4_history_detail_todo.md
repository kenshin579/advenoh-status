# History 페이지 상세 정보 표시 - Todo

## Phase 1: 타입 및 데이터 조회 수정

- [x] `src/types/index.ts`에 `ServiceStatusLogWithService` 타입 추가
- [x] `src/hooks/useServices.ts`의 `useUptimeData` 훅 수정
  - [x] Supabase 쿼리에 services 테이블 조인 추가
  - [x] 반환 타입을 `ServiceStatusLogWithService[]`로 변경

## Phase 2: MonthlyCalendar 클릭 이벤트 추가

- [x] `src/components/MonthlyCalendar.tsx` 수정
  - [x] Props 인터페이스에 `selectedDate`, `onDateClick` 추가
  - [x] 날짜 셀에 onClick 핸들러 추가
  - [x] 선택된 날짜 스타일링 추가 (`ring-2 ring-indigo-600`)

## Phase 3: DayDetailPanel 컴포넌트 생성

- [x] `src/components/DayDetailPanel.tsx` 신규 생성
  - [x] 선택된 날짜 없을 때 안내 메시지 표시
  - [x] 선택된 날짜의 로그 필터링 로직 구현
  - [x] 전체 상태 요약 표시 (ERROR > WARN > OK 우선순위)
  - [x] 서비스별 상태 목록 표시
    - [x] 서비스 이름
    - [x] 상태 배지
    - [x] 응답 시간
    - [x] HTTP 상태 코드
    - [x] 타임스탬프
    - [x] 메시지 (있는 경우)

## Phase 4: History 페이지 통합

- [x] `src/app/history/page.tsx` 수정
  - [x] `selectedDate` 상태 추가
  - [x] `handleDateClick` 핸들러 구현 (토글 기능 포함)
  - [x] `MonthlyCalendar`에 props 전달
  - [x] `DayDetailPanel` 컴포넌트 추가

## Phase 5: 테스트 (MCP Playwright 사용)

- [x] 날짜 클릭 시 선택 상태 변경 확인
- [x] 같은 날짜 다시 클릭 시 선택 해제 확인
- [x] 데이터가 있는 날짜 선택 시 상세 정보 표시 확인
- [x] 데이터가 없는 날짜 선택 시 "No data" 메시지 확인
- [x] 여러 서비스 로그가 있는 경우 모두 표시 확인
- [x] 모바일 뷰포트에서 레이아웃 확인
