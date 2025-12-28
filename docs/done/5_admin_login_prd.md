# 어드민 로그인 기능

## 개요

Status 모니터링 페이지에 어드민 로그인 기능을 추가한다. 로그인 버튼은 기본적으로 노출하지 않고, 특정 쿼리 파라미터(`?enable_login=true`)가 있을 때만 표시한다. 로그인 가능한 사용자는 `users` 테이블에 등록된 사용자로 제한한다.

## 현재 상태 분석

### 관련 파일
- `src/components/Header.tsx` - 헤더 네비게이션 컴포넌트
- `src/lib/supabase.ts` - Supabase 클라이언트 (브라우저용)
- `src/app/layout.tsx` - 루트 레이아웃
- `supabase/migrations/001_initial_schema.sql` - 현재 DB 스키마

### 현재 구현
1. **인증 시스템 없음**
   - useAuth 훅 없음
   - 로그인/로그아웃 기능 없음
   - 사용자 세션 관리 없음

2. **Supabase 클라이언트**
   ```typescript
   // src/lib/supabase.ts
   import { createBrowserClient } from '@supabase/ssr';
   // anon key만 사용 (읽기 전용)
   ```

3. **Header 컴포넌트**
   - 로고 + Dashboard/History 네비게이션만 존재
   - 로그인 버튼 없음
   - 쿼리 파라미터 처리 없음

4. **데이터베이스 테이블**
   - `services` - 모니터링 대상 서비스
   - `service_status_logs` - 상태 변경 로그
   - **`users` 테이블 없음** (신규 생성 필요)

## 요구사항

### 기능 요구사항

1. **로그인 버튼 조건부 표시**
   - 기본: 로그인 버튼 숨김
   - `?enable_login=true` 쿼리 파라미터가 있을 때만 로그인 버튼 표시
   - 이미 로그인된 상태면 쿼리 파라미터 없이도 사용자 정보/로그아웃 버튼 표시

2. **로그인 모달**
   - 로그인 버튼 클릭 시 모달 형태로 로그인 폼 표시
   - 이메일/비밀번호 입력 필드
   - 로그인/취소 버튼
   - 에러 메시지 표시 (잘못된 자격 증명)

3. **사용자 검증**
   - Supabase Auth로 인증 후, `users` 테이블에 존재하는 사용자인지 확인
   - `users` 테이블에 없으면 로그인 거부 및 세션 종료
   - 테이블에 있으면 로그인 성공

4. **로그인 상태 표시**
   - 로그인 성공 시 Header에 사용자 이메일 표시
   - 로그아웃 버튼 제공
   - 로그아웃 시 세션 종료 및 초기 상태로 복귀

5. **세션 유지**
   - 페이지 새로고침 시에도 로그인 상태 유지
   - Supabase Auth 세션 기반

### 비기능 요구사항

1. **보안**
   - 비밀번호는 Supabase Auth가 처리 (클라이언트에서 직접 저장하지 않음)
   - users 테이블 RLS로 직접 접근 차단
   - HTTPS 통신 필수

2. **UX**
   - 로그인 진행 중 로딩 표시
   - 명확한 에러 메시지
   - 반응형 모달 디자인

3. **성능**
   - 인증 체크로 인한 페이지 로딩 지연 최소화
   - 세션 캐싱으로 불필요한 API 호출 방지

## 데이터베이스 스키마

### 신규 테이블: users

```sql
-- users 테이블: 로그인 허용 사용자 목록
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- authenticated 사용자만 자신의 정보 조회 가능
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- 초기 어드민 사용자 등록
INSERT INTO users (email, name, role) VALUES
  ('admin@example.com', 'Admin', 'admin');
```

## 구현 계획

### Phase 1: 기반 구조

1. **DB 마이그레이션**
   - `supabase/migrations/002_add_users.sql` 생성
   - users 테이블 및 RLS 정책

2. **Auth 훅 생성**
   - `src/hooks/useAuth.ts`
   - 로그인/로그아웃/세션 관리
   - users 테이블 검증 로직

### Phase 2: UI 컴포넌트

3. **로그인 모달**
   - `src/components/LoginModal.tsx`
   - 이메일/비밀번호 폼
   - 에러 처리

4. **Header 수정**
   - `src/components/Header.tsx`
   - 쿼리 파라미터 감지
   - 로그인/로그아웃 버튼
   - 사용자 정보 표시

### Phase 3: 통합

5. **Auth Context (선택)**
   - 전역 상태로 인증 정보 관리
   - 필요시 `src/contexts/AuthContext.tsx`

## 테스트 케이스

1. `?enable_login=true` 없이 접속 시 로그인 버튼 숨김
2. `?enable_login=true`로 접속 시 로그인 버튼 표시
3. 잘못된 이메일/비밀번호로 로그인 시 에러 메시지
4. Supabase Auth에는 있지만 users 테이블에 없는 사용자 로그인 시 거부
5. users 테이블에 있는 사용자 로그인 성공
6. 로그인 후 Header에 사용자 이메일 표시
7. 로그아웃 버튼 클릭 시 세션 종료
8. 페이지 새로고침 시 로그인 상태 유지
9. 로그인 상태에서는 쿼리 파라미터 없이도 로그아웃 버튼 표시

## 관련 파일 변경 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `supabase/migrations/002_add_users.sql` | 신규 | users 테이블 스키마 |
| `src/hooks/useAuth.ts` | 신규 | 인증 훅 |
| `src/components/LoginModal.tsx` | 신규 | 로그인 모달 |
| `src/components/Header.tsx` | 수정 | 로그인 버튼/사용자 표시 |
| `src/types/index.ts` | 수정 | User 타입 추가 |

## 주의사항

1. **쿼리 파라미터 오타 주의**: `enable_login` (enable_log 아님)
2. **Supabase Auth 사용자 생성**: users 테이블에 추가하기 전에 Supabase Dashboard에서 Auth 사용자도 생성해야 함
3. **환경 변수**: 프론트엔드는 anon key만 사용, service_role key는 서버 측에서만 사용
