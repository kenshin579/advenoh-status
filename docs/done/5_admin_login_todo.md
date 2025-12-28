# 어드민 로그인 기능 구현 체크리스트

## Phase 1: 데이터베이스

- [x] `supabase/migrations/002_add_users.sql` 생성
  - [x] users 테이블 스키마 작성
  - [x] RLS 정책 설정
- [ ] Supabase Dashboard에서 마이그레이션 실행
- [ ] Admin 사용자 등록
  - [ ] Supabase Auth에서 사용자 생성
  - [ ] users 테이블에 동일 이메일로 INSERT

## Phase 2: 타입 및 훅

- [x] `src/types/index.ts`에 User 타입 추가
- [x] `src/hooks/useAuth.ts` 생성
  - [x] 세션 체크 로직
  - [x] signIn 함수 (users 테이블 검증 포함)
  - [x] signOut 함수
  - [x] onAuthStateChange 구독

## Phase 3: UI 컴포넌트

- [x] `src/components/LoginModal.tsx` 생성
  - [x] 이메일/비밀번호 폼
  - [x] 로딩 상태 표시
  - [x] 에러 메시지 표시
  - [x] 취소/로그인 버튼
- [x] `src/components/Header.tsx` 수정
  - [x] useSearchParams로 쿼리 파라미터 감지
  - [x] 조건부 로그인 버튼 표시
  - [x] 로그인 상태 시 사용자 이메일 표시
  - [x] 로그아웃 버튼

## Phase 4: 테스트 (MCP Playwright 사용)

- [x] `?enable_login=true` 없이 접속 → 로그인 버튼 숨김 확인
- [x] `?enable_login=true` 접속 → 로그인 버튼 표시 확인
- [x] 로그인 버튼 클릭 → 모달 오픈 확인
- [x] 잘못된 자격 증명 → 에러 메시지 확인
- [ ] users 테이블에 없는 사용자 → "접근 권한 없음" 확인 (수동 테스트 필요)
- [ ] 정상 로그인 → 사용자 이메일 표시 확인 (수동 테스트 필요)
- [ ] 로그아웃 → 초기 상태 복귀 확인 (수동 테스트 필요)
- [ ] 페이지 새로고침 → 로그인 상태 유지 확인 (수동 테스트 필요)
