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

-- 초기 어드민 사용자 등록 (이메일은 실제 사용할 이메일로 변경)
-- INSERT INTO users (email, name, role) VALUES
--   ('your-admin@example.com', 'Admin', 'admin');
