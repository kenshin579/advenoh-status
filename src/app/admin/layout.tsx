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
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex">
      <AdminSidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
