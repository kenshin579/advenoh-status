-- ============================================
-- RLS 정책 수정: auth.jwt() ->> 'email' → auth.email()
-- 문제: auth.jwt() ->> 'email' 구문이 NULL을 반환하여 RLS 정책 실패
-- 해결: Supabase 공식 헬퍼 함수 auth.email() 사용
-- ============================================

-- 기존 services 테이블 Admin 정책 삭제
DROP POLICY IF EXISTS "Admin can insert services" ON services;
DROP POLICY IF EXISTS "Admin can update services" ON services;
DROP POLICY IF EXISTS "Admin can delete services" ON services;

-- 기존 users 테이블 정책 삭제
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- ============================================
-- users 테이블 RLS 정책 재생성
-- ============================================
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (email = auth.email());

-- ============================================
-- services 테이블 Admin CRUD RLS 정책 재생성
-- ============================================

-- Admin 사용자만 서비스 추가 가능
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

-- Admin 사용자만 서비스 수정 가능
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

-- Admin 사용자만 서비스 삭제 가능
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
