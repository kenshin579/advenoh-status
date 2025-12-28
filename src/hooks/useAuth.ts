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

      if (!session?.user?.email) {
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
