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
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.24em',
          color: 'var(--color-cyan)',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        // CONFIG
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 24,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              margin: '0 0 6px',
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              background: 'linear-gradient(90deg, var(--color-text), var(--color-accent) 130%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Service control
          </h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {services.length} endpoints registered
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="mono"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
            color: '#fff',
            border: 'none',
            padding: '11px 22px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-accent) 33%, transparent)',
          }}
        >
          + Add Service
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            background: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
            borderRadius: 8,
            color: 'var(--color-error)',
            fontSize: 13,
          }}
        >
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
