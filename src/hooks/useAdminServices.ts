'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { Service, CreateServiceInput, UpdateServiceInput, ServiceInsert, ServiceUpdate } from '@/types';

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
      setError(err instanceof Error ? err.message : 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 서비스 생성
  const createService = async (input: CreateServiceInput): Promise<boolean> => {
    try {
      const insertData: ServiceInsert = {
        name: input.name,
        url: input.url,
        threshold_ms: input.threshold_ms ?? 3000,
      };
      const { error: insertError } = await supabase
        .from('services')
        .insert(insertData);

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This URL is already registered.');
        } else {
          setError(insertError.message);
        }
        return false;
      }

      await fetchServices();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service.');
      return false;
    }
  };

  // 서비스 수정
  const updateService = async (id: string, input: UpdateServiceInput): Promise<boolean> => {
    try {
      const updateData: ServiceUpdate = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.url !== undefined) updateData.url = input.url;
      if (input.threshold_ms !== undefined) updateData.threshold_ms = input.threshold_ms;

      const { error: updateError } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return false;
      }

      await fetchServices();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service.');
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
      setError(err instanceof Error ? err.message : 'Failed to delete service.');
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
