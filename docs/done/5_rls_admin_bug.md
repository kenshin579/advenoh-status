# 서비스 어드민 관리 페이지 버그 분석

## 발견된 문제

### 1. Edit 기능이 동작하지 않음
- **증상**: Edit 버튼 클릭 후 수정 저장 시 콘솔 오류 없음, PATCH API 204 응답 반환, 하지만 실제 데이터 반영 안됨
- **재현 경로**: Admin > Service Management > Edit 버튼 클릭 > 값 수정 > Save

### 2. 서비스 추가 시 RLS 오류 발생
- **증상**: `new row violates row-level security policy for table "services"` 오류
- **재현 경로**: Admin > Service Management > Add Service 버튼 클릭 > 정보 입력 > Save

---

## 원인 분석

### 공통 원인: JWT에서 이메일 추출 방식 문제

현재 RLS 정책 ([003_add_admin_policies.sql](../../supabase/migrations/003_add_admin_policies.sql)):
```sql
WHERE email = auth.jwt() ->> 'email'
```

**문제점**:
- Supabase Auth JWT 구조에서 `email` 필드는 최상위가 아닌 `user_metadata` 또는 다른 위치에 있을 수 있음
- `auth.jwt() ->> 'email'`이 `null`을 반환하면 `users` 테이블과 매칭 실패

### 문제 1 상세: Edit 기능

**코드 위치**: [useAdminServices.ts:63-86](../../src/hooks/useAdminServices.ts#L63-L86)

```typescript
const { error: updateError } = await supabase
  .from('services')
  .update(updateData)
  .eq('id', id);
```

**RLS 정책 문제**:
```sql
-- 현재 정책 (USING 절만 존재)
CREATE POLICY "Admin can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'admin'
    )
  );
```

**동작 방식**:
1. `USING` 절 조건이 `false`이면 → 업데이트 대상 행이 0개로 필터됨
2. Supabase는 0개 행 업데이트 시 **오류를 발생시키지 않음**
3. 결과: 204 응답 (성공), 하지만 실제 변경 없음

### 문제 2 상세: Insert RLS 오류

**RLS 정책**:
```sql
CREATE POLICY "Admin can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'admin'
    )
  );
```

**동작 방식**:
- INSERT는 `WITH CHECK` 절이 `false`일 때 명시적 오류 발생
- `auth.jwt() ->> 'email'`이 `null`이거나 `users` 테이블에 없으면 조건 실패

---

## 원인 확인 결과 (2025-12-29)

### 테스트 결과
Supabase SQL Editor에서 다음 쿼리 실행:
```sql
SELECT
  auth.email() as auth_email_func,
  auth.jwt() ->> 'email' as jwt_email_extract,
  auth.jwt() as full_jwt;
```

**결과:**
| auth_email_func | jwt_email_extract | full_jwt |
|-----------------|-------------------|----------|
| NULL            | NULL              | NULL     |

### 확인된 사실
1. JWT 토큰에 `email: kenshin579@hotmail.com` 정상 포함 ✅
2. users 테이블에 admin으로 정상 등록 ✅
3. Authorization 헤더에 Bearer JWT 토큰 정상 전달 ✅
4. **`auth.jwt() ->> 'email'` 구문이 서버에서 NULL 반환** ❌

### 근본 원인
RLS 정책에서 사용한 `auth.jwt() ->> 'email'` 구문이 Supabase PostgREST에서 제대로 인식되지 않음.

---

## 해결 방안

### 방안 1: RLS 정책 수정 (필수)

`auth.jwt() ->> 'email'` 대신 `auth.email()` 함수 사용.

**마이그레이션 파일 생성됨:** [004_fix_rls_auth_email.sql](../../supabase/migrations/004_fix_rls_auth_email.sql)

Supabase SQL Editor에서 실행:
```sql
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admin can insert services" ON services;
DROP POLICY IF EXISTS "Admin can update services" ON services;
DROP POLICY IF EXISTS "Admin can delete services" ON services;
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- users 테이블 정책 재생성
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (email = auth.email());

-- services 테이블 Admin 정책 재생성
CREATE POLICY "Admin can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.email = auth.email()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.email = auth.email()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.email = auth.email()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.email = auth.email()
      AND users.role = 'admin'
    )
  );
```

### 방안 2: 클라이언트에서 반환값 검증 강화 (선택)

[useAdminServices.ts](../../src/hooks/useAdminServices.ts) 수정:

```typescript
// updateService 함수에서 영향받은 행 수 확인
const { data, error: updateError } = await supabase
  .from('services')
  .update(updateData)
  .eq('id', id)
  .select();

if (updateError) {
  setError(updateError.message);
  return false;
}

// 업데이트된 행이 없으면 권한 문제
if (!data || data.length === 0) {
  setError('Update failed. You may not have permission to modify this service.');
  return false;
}
```

---

## 구현 태스크

- [x] Supabase Dashboard에서 JWT 구조 확인
- [x] users 테이블에 현재 사용자가 admin으로 등록되어 있는지 확인
- [x] 원인 분석: `auth.jwt() ->> 'email'`이 NULL 반환 확인
- [x] RLS 정책 마이그레이션 파일 생성 (`auth.email()` 사용)
- [x] 클라이언트 반환값 검증 로직 추가 (useAdminServices.ts)
- [ ] **Supabase SQL Editor에서 마이그레이션 실행**
- [ ] Edit/Add 기능 재테스트

---

## 참고 자료

- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Helper Functions](https://supabase.com/docs/guides/database/postgres/row-level-security#helper-functions)
  - `auth.uid()`: 현재 사용자 UUID
  - `auth.email()`: 현재 사용자 이메일
  - `auth.jwt()`: JWT 토큰 전체
