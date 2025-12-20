# History 페이지 상세 정보 표시 기능

## 개요

History 페이지에서 달력의 날짜를 클릭하면 해당 날짜의 상세 상태 정보를 달력 아래에 표시하는 기능을 추가한다.

## 현재 상태 분석

### 관련 파일
- `src/app/history/page.tsx` - History 페이지 컴포넌트
- `src/components/MonthlyCalendar.tsx` - 월별 달력 컴포넌트
- `src/hooks/useServices.ts` - 데이터 fetching 훅
- `src/types/index.ts` - TypeScript 타입 정의

### 현재 구현
1. **MonthlyCalendar 컴포넌트**
   - 6개월의 달력을 CSS Grid로 표시
   - 각 날짜는 상태에 따라 색상 표시 (OK: 녹색, WARN: 노란색, ERROR: 빨간색, NONE: 회색)
   - 호버 시 툴팁으로 날짜와 상태만 표시
   - **클릭 핸들러 없음** (cursor-pointer 스타일만 적용됨)

2. **데이터 구조**
   ```typescript
   interface ServiceStatusLog {
     id: number;
     service_id: string;  // UUID
     timestamp: string;
     status: 'OK' | 'WARN' | 'ERROR';
     response_time: number;
     http_status: number | null;
     message: string | null;
   }
   ```

3. **현재 데이터 조회**
   - `useUptimeData(365)` 훅으로 1년치 상태 로그 조회
   - 서비스 이름은 포함되지 않음 (service_id만 존재)

## 요구사항

### 기능 요구사항

1. **날짜 클릭 이벤트**
   - 달력의 날짜 셀을 클릭하면 해당 날짜가 선택됨
   - 선택된 날짜는 시각적으로 구분 (예: 테두리 강조)
   - 같은 날짜를 다시 클릭하면 선택 해제

2. **상세 정보 패널**
   - 달력 아래에 상세 정보 섹션 추가
   - 선택된 날짜가 없으면 안내 메시지 표시
   - 선택된 날짜에 데이터가 없으면 "No data" 표시

3. **상세 정보 내용**
   - 선택된 날짜 표시 (예: "2024년 12월 20일")
   - 해당 날짜의 전체 상태 요약 (OK/WARN/ERROR)
   - 서비스별 상태 목록:
     - 서비스 이름
     - 상태 (색상 배지)
     - 응답 시간 (ms)
     - HTTP 상태 코드
     - 메시지 (있는 경우)
     - 타임스탬프

### 비기능 요구사항

1. **반응형 디자인**: 모바일/태블릿/데스크톱 대응
2. **성능**: 날짜 클릭 시 추가 API 호출 없이 기존 데이터에서 필터링
3. **접근성**: 키보드 네비게이션 지원

## 테스트 케이스

1. 날짜 클릭 시 선택 상태 변경
2. 같은 날짜 다시 클릭 시 선택 해제
3. 데이터가 있는 날짜 선택 시 상세 정보 표시
4. 데이터가 없는 날짜 선택 시 "No data" 표시
5. 여러 서비스 로그가 있는 경우 모두 표시
6. 모바일에서 상세 패널 레이아웃 확인

## 관련 파일 변경 목록

| 파일 | 변경 유형 |
|------|-----------|
| `src/app/history/page.tsx` | 수정 |
| `src/components/MonthlyCalendar.tsx` | 수정 |
| `src/components/DayDetailPanel.tsx` | 신규 |
| `src/hooks/useServices.ts` | 수정 |
| `src/types/index.ts` | 수정 |
