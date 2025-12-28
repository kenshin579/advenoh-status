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
        <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Service
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
