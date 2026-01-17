# 어드민 서비스 관리 기능 구현 체크리스트

## Phase 1: 기본 구조

- [x] 타입 정의 추가 (`src/types/index.ts`)
  - [x] `CreateServiceInput` 인터페이스
  - [x] `UpdateServiceInput` 인터페이스

- [x] 어드민 레이아웃 생성 (`src/app/admin/layout.tsx`)
  - [x] 로그인 체크 및 리다이렉트
  - [x] 사이드바 + 콘텐츠 영역 레이아웃

- [x] 사이드바 컴포넌트 (`src/components/admin/AdminSidebar.tsx`)
  - [x] 메뉴 항목 (서비스 관리)
  - [x] 활성 상태 하이라이트

---

## Phase 2: 데이터베이스 및 CRUD

- [x] RLS 정책 추가 (`supabase/migrations/003_add_admin_policies.sql`)
  - [x] Admin INSERT 정책
  - [x] Admin UPDATE 정책
  - [x] Admin DELETE 정책
  - [ ] Supabase에 마이그레이션 적용 (수동)

- [x] useAdminServices 훅 (`src/hooks/useAdminServices.ts`)
  - [x] 서비스 목록 조회 (fetchServices)
  - [x] 서비스 생성 (createService)
  - [x] 서비스 수정 (updateService)
  - [x] 서비스 삭제 (deleteService)
  - [x] 에러 처리

---

## Phase 3: UI 컴포넌트

- [x] 서비스 관리 페이지 (`src/app/admin/page.tsx`)
  - [x] 페이지 헤더 (제목 + 추가 버튼)
  - [x] 에러 메시지 표시
  - [x] 모달 상태 관리

- [x] 서비스 목록 테이블 (`src/components/admin/ServiceList.tsx`)
  - [x] 테이블 헤더 (서비스명, URL, Threshold, 생성일, 액션)
  - [x] 서비스 행 렌더링
  - [x] 로딩 상태
  - [x] 빈 상태 메시지
  - [x] 수정/삭제 버튼

- [x] 서비스 폼 모달 (`src/components/admin/ServiceFormModal.tsx`)
  - [x] 추가/수정 모드 구분
  - [x] 폼 필드 (서비스명, URL, Threshold)
  - [x] URL 유효성 검사
  - [x] 로딩 상태 (저장 중...)
  - [x] 에러 메시지 표시

- [x] 삭제 확인 모달 (`src/components/admin/DeleteConfirmModal.tsx`)
  - [x] 확인 메시지
  - [x] 취소/삭제 버튼

---

## Phase 4: 네비게이션 연동

- [x] Header 수정 (`src/components/Header.tsx`)
  - [x] 로그인 시 Admin 링크 표시
  - [x] Admin 페이지 활성 상태 스타일

---

## Phase 5: 테스트 (MCP Playwright)

- [x] E2E 테스트
  - [x] 비로그인 사용자 접근 차단 테스트
  - [x] Admin 링크 비표시 테스트 (비로그인 시)
  - [ ] 로그인 후 Admin 링크 표시 테스트 (skipped - 인증 설정 필요)
  - [ ] 서비스 목록 조회 테스트 (skipped - 인증 설정 필요)
  - [ ] 서비스 추가 테스트 (skipped - 인증 설정 필요)
  - [ ] 서비스 수정 테스트 (skipped - 인증 설정 필요)
  - [ ] 서비스 삭제 테스트 (skipped - 인증 설정 필요)
  - [ ] URL 유효성 검사 테스트 (skipped - 인증 설정 필요)

---

## 완료 후 정리

- [x] 빌드 확인 (`npm run build`)
- [x] 테스트 확인 (`npm run test`)
- [ ] 문서 업데이트
  - [ ] PRD를 done 폴더로 이동
  - [ ] implementation을 done 폴더로 이동
