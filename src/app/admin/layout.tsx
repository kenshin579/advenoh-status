'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/?enable_login=true');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div
        className="mono"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 4rem)',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.2em',
          fontSize: 12,
        }}
      >
        // LOADING ADMIN
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 4rem)' }}>
      <AdminSidebar />
      <main
        style={{
          flex: 1,
          padding: 28,
        }}
      >
        {children}
      </main>
    </div>
  );
}
