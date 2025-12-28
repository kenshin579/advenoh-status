# 어드민 로그인 기능 구현

## 1. 데이터베이스 마이그레이션

### `supabase/migrations/002_add_users.sql`

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

-- 초기 어드민 사용자 등록 (이메일은 실제 사용할 이메일로 변경)
INSERT INTO users (email, name, role) VALUES
  ('your-admin@example.com', 'Admin', 'admin');
```

## 2. 타입 정의

### `src/types/index.ts` 추가

```typescript
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}
```

## 3. useAuth 훅

### `src/hooks/useAuth.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/types';

interface AuthState {
  user: SupabaseUser | null;
  dbUser: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    dbUser: null,
    loading: true,
    error: null,
  });

  const supabase = createClient();

  // 세션 체크 및 users 테이블 검증
  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setState({ user: null, dbUser: null, loading: false, error: null });
        return;
      }

      // users 테이블에서 사용자 확인
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (error || !dbUser) {
        // users 테이블에 없으면 로그아웃
        await supabase.auth.signOut();
        setState({ user: null, dbUser: null, loading: false, error: null });
        return;
      }

      setState({ user: session.user, dbUser, loading: false, error: null });
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [supabase]);

  // 로그인
  const signIn = async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setState(prev => ({ ...prev, loading: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }));
        return false;
      }

      // users 테이블에서 사용자 확인
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (dbError || !dbUser) {
        await supabase.auth.signOut();
        setState(prev => ({ ...prev, loading: false, error: '접근 권한이 없습니다.' }));
        return false;
      }

      setState({ user: data.user, dbUser, loading: false, error: null });
      return true;
    } catch {
      setState(prev => ({ ...prev, loading: false, error: '로그인 중 오류가 발생했습니다.' }));
      return false;
    }
  };

  // 로그아웃
  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, dbUser: null, loading: false, error: null });
  };

  // 초기 세션 체크
  useEffect(() => {
    checkSession();

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });

    return () => subscription.unsubscribe();
  }, [checkSession, supabase.auth]);

  return {
    user: state.user,
    dbUser: state.dbUser,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.dbUser,
    signIn,
    signOut,
    clearError: () => setState(prev => ({ ...prev, error: null })),
  };
}
```

## 4. 로그인 모달

### `src/components/LoginModal.tsx`

```typescript
'use client';

import { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<boolean>;
  error: string | null;
  loading: boolean;
}

export default function LoginModal({ isOpen, onClose, onLogin, error, loading }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onLogin(email, password);
    if (success) {
      setEmail('');
      setPassword('');
      onClose();
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">로그인</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## 5. Header 컴포넌트 수정

### `src/components/Header.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoginModal from './LoginModal';

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, dbUser, loading, error, signIn, signOut, clearError } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const enableLogin = searchParams.get('enable_login') === 'true';
  const showLoginButton = enableLogin && !isAuthenticated && !loading;
  const showUserInfo = isAuthenticated && !loading;

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/history', label: 'History' },
  ];

  const handleOpenModal = () => {
    clearError();
    setIsModalOpen(true);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Advenoh Status</span>
            </Link>

            {/* Navigation + Auth */}
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? 'text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Login Button */}
              {showLoginButton && (
                <button
                  onClick={handleOpenModal}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  로그인
                </button>
              )}

              {/* User Info */}
              {showUserInfo && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{dbUser?.email}</span>
                  <button
                    onClick={signOut}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <LoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLogin={signIn}
        error={error}
        loading={loading}
      />
    </>
  );
}
```

## 6. Admin 사용자 등록

### Step 1: Supabase Auth 사용자 생성

Supabase Dashboard에서 Auth 사용자 생성:

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 > **Authentication** > **Users**
3. **Add user** > **Create new user** 클릭
4. 정보 입력:
   - Email: `<your-email>`
   - Password: `<your-password>`
   - Auto Confirm User: 체크
5. **Create user** 클릭

### Step 2: users 테이블에 사용자 추가

Supabase Dashboard > **SQL Editor**에서 실행:

```sql
INSERT INTO users (email, name, role) VALUES
  ('<your-email>', 'admin', 'admin');
```

또는 **Table Editor** > `users` 테이블에서 직접 추가:
- email: `<your-email>`
- name: `admin`
- role: `admin`

### 주의사항

- Auth 사용자와 users 테이블의 이메일이 **정확히 일치**해야 함
- Auth에만 있고 users 테이블에 없으면 로그인 거부됨
- 비밀번호는 Auth에서만 관리 (users 테이블에 저장하지 않음)

## 파일 변경 요약

| 파일 | 변경 유형 |
|------|-----------|
| `supabase/migrations/002_add_users.sql` | 신규 |
| `src/types/index.ts` | 수정 |
| `src/hooks/useAuth.ts` | 신규 |
| `src/components/LoginModal.tsx` | 신규 |
| `src/components/Header.tsx` | 수정 |
