# 어드민 서비스 관리 기능 구현

## 1. 데이터베이스 마이그레이션

### `supabase/migrations/003_add_admin_policies.sql`

```sql
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
```

---

## 2. 타입 정의 추가

### `src/types/index.ts` 추가

```typescript
// 서비스 생성 입력
export interface CreateServiceInput {
  name: string;
  url: string;
  threshold_ms?: number;
}

// 서비스 수정 입력
export interface UpdateServiceInput {
  name?: string;
  url?: string;
  threshold_ms?: number;
}
```

---

## 3. useAdminServices 훅

### `src/hooks/useAdminServices.ts`

```typescript
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { Service, CreateServiceInput, UpdateServiceInput } from '@/types';

export function useAdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // 서비스 목록 조회
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setServices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '서비스 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 서비스 생성
  const createService = async (input: CreateServiceInput): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('services')
        .insert({
          name: input.name,
          url: input.url,
          threshold_ms: input.threshold_ms ?? 3000,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('이미 등록된 URL입니다.');
        } else {
          setError(insertError.message);
        }
        return false;
      }

      await fetchServices();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '서비스 생성에 실패했습니다.');
      return false;
    }
  };

  // 서비스 수정
  const updateService = async (id: string, input: UpdateServiceInput): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('services')
        .update(input)
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return false;
      }

      await fetchServices();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '서비스 수정에 실패했습니다.');
      return false;
    }
  };

  // 서비스 삭제
  const deleteService = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (deleteError) {
        setError(deleteError.message);
        return false;
      }

      await fetchServices();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '서비스 삭제에 실패했습니다.');
      return false;
    }
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    createService,
    updateService,
    deleteService,
    refresh: fetchServices,
    clearError: () => setError(null),
  };
}
```

---

## 4. 어드민 레이아웃

### `src/app/admin/layout.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## 5. 어드민 사이드바

### `src/components/admin/AdminSidebar.tsx`

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
  href: string;
  label: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { href: '/admin', label: '서비스 관리', icon: '🖥️' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-gray-50 border-r border-gray-200 min-h-[calc(100vh-4rem)]">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin</h2>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
```

---

## 6. 서비스 관리 페이지

### `src/app/admin/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useAdminServices } from '@/hooks/useAdminServices';
import ServiceList from '@/components/admin/ServiceList';
import ServiceFormModal from '@/components/admin/ServiceFormModal';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';
import type { Service } from '@/types';

export default function AdminServicesPage() {
  const { services, loading, error, createService, updateService, deleteService, clearError } = useAdminServices();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const handleAdd = () => {
    clearError();
    setEditingService(null);
    setIsFormOpen(true);
  };

  const handleEdit = (service: Service) => {
    clearError();
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleDelete = (service: Service) => {
    setDeletingService(service);
  };

  const handleFormSubmit = async (data: { name: string; url: string; threshold_ms: number }) => {
    let success: boolean;
    if (editingService) {
      success = await updateService(editingService.id, data);
    } else {
      success = await createService(data);
    }
    if (success) {
      setIsFormOpen(false);
      setEditingService(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingService) {
      const success = await deleteService(deletingService.id);
      if (success) {
        setDeletingService(null);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">서비스 관리</h1>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          서비스 추가
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}

      <ServiceList
        services={services}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ServiceFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        service={editingService}
        error={error}
      />

      <DeleteConfirmModal
        isOpen={!!deletingService}
        onClose={() => setDeletingService(null)}
        onConfirm={handleDeleteConfirm}
        serviceName={deletingService?.name || ''}
      />
    </div>
  );
}
```

---

## 7. 서비스 목록 컴포넌트

### `src/components/admin/ServiceList.tsx`

```typescript
'use client';

import type { Service } from '@/types';

interface ServiceListProps {
  services: Service[];
  loading: boolean;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

export default function ServiceList({ services, loading, onEdit, onDelete }: ServiceListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        로딩 중...
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        등록된 서비스가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              서비스명
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              URL
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Threshold
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              생성일
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              액션
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {services.map((service) => (
            <tr key={service.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {service.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <a
                  href={service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {service.url}
                </a>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {service.threshold_ms}ms
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(service.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  onClick={() => onEdit(service)}
                  className="text-blue-600 hover:text-blue-800 mr-4"
                >
                  수정
                </button>
                <button
                  onClick={() => onDelete(service)}
                  className="text-red-600 hover:text-red-800"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 8. 서비스 폼 모달

### `src/components/admin/ServiceFormModal.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import type { Service } from '@/types';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; url: string; threshold_ms: number }) => Promise<void>;
  service: Service | null;
  error: string | null;
}

export default function ServiceFormModal({
  isOpen,
  onClose,
  onSubmit,
  service,
  error,
}: ServiceFormModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [thresholdMs, setThresholdMs] = useState(3000);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isEdit = !!service;

  useEffect(() => {
    if (service) {
      setName(service.name);
      setUrl(service.url);
      setThresholdMs(service.threshold_ms);
    } else {
      setName('');
      setUrl('');
      setThresholdMs(3000);
    }
    setValidationError(null);
  }, [service, isOpen]);

  if (!isOpen) return null;

  const validateUrl = (value: string): boolean => {
    try {
      const urlObj = new URL(value);
      return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('서비스명을 입력하세요.');
      return;
    }

    if (!validateUrl(url)) {
      setValidationError('올바른 URL 형식을 입력하세요. (https:// 또는 http://)');
      return;
    }

    if (thresholdMs < 0) {
      setValidationError('Threshold는 0 이상이어야 합니다.');
      return;
    }

    setSubmitting(true);
    await onSubmit({ name: name.trim(), url: url.trim(), threshold_ms: thresholdMs });
    setSubmitting(false);
  };

  const handleClose = () => {
    setName('');
    setUrl('');
    setThresholdMs(3000);
    setValidationError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isEdit ? '서비스 수정' : '서비스 추가'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              서비스명 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
              placeholder="예: My Service"
            />
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 mb-1">
              Threshold (ms)
            </label>
            <input
              id="threshold"
              type="number"
              value={thresholdMs}
              onChange={(e) => setThresholdMs(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
              min={0}
            />
          </div>

          {(validationError || error) && (
            <p className="text-sm text-red-600">{validationError || error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={submitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 9. 삭제 확인 모달

### `src/components/admin/DeleteConfirmModal.tsx`

```typescript
'use client';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  serviceName: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">서비스 삭제</h2>

        <p className="text-gray-600 mb-2">
          &quot;{serviceName}&quot; 서비스를 삭제하시겠습니까?
        </p>
        <p className="text-sm text-gray-500 mb-6">
          삭제 시 관련 상태 로그도 함께 삭제됩니다.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 10. Header 수정

### `src/components/Header.tsx` 수정 사항

navLinks 배열에 Admin 링크 조건부 추가:

```typescript
// 기존 navLinks 정의 부분을 수정
const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/history', label: 'History' },
  // isAuthenticated일 때만 Admin 링크 추가
  ...(isAuthenticated ? [{ href: '/admin', label: 'Admin' }] : []),
];
```

---

## 파일 변경 요약

| 파일 | 변경 유형 |
|------|----------|
| `supabase/migrations/003_add_admin_policies.sql` | 신규 |
| `src/types/index.ts` | 수정 |
| `src/hooks/useAdminServices.ts` | 신규 |
| `src/app/admin/layout.tsx` | 신규 |
| `src/app/admin/page.tsx` | 신규 |
| `src/components/admin/AdminSidebar.tsx` | 신규 |
| `src/components/admin/ServiceList.tsx` | 신규 |
| `src/components/admin/ServiceFormModal.tsx` | 신규 |
| `src/components/admin/DeleteConfirmModal.tsx` | 신규 |
| `src/components/Header.tsx` | 수정 |
