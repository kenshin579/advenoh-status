-- ============================================
-- services 테이블 Admin CRUD RLS 정책
-- ============================================

-- Admin 사용자만 서비스 추가 가능
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

-- Admin 사용자만 서비스 수정 가능
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

-- Admin 사용자만 서비스 삭제 가능
CREATE POLICY "Admin can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'admin'
    )
  );
