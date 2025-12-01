'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { Service, ServiceWithStatus, ServiceStatusLog, StatusType } from '@/types';

export function useServices() {
  const [services, setServices] = useState<ServiceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchServices() {
      try {
        // Fetch all services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*');

        if (servicesError) throw servicesError;

        // For each service, get the latest status
        const servicesWithStatus = await Promise.all(
          ((servicesData as Service[]) || []).map(async (service) => {
            const { data: logs } = await supabase
              .from('service_status_logs')
              .select('status, timestamp')
              .eq('service_id', service.id)
              .order('timestamp', { ascending: false })
              .limit(1);

            const logData = logs as { status: StatusType; timestamp: string }[] | null;

            return {
              ...service,
              currentStatus: logData?.[0]?.status || 'OK',
              lastChecked: logData?.[0]?.timestamp || null,
            } as ServiceWithStatus;
          })
        );

        setServices(servicesWithStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch services');
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, [supabase]);

  return { services, loading, error };
}

export function useUptimeData(days: number = 90) {
  const [data, setData] = useState<ServiceStatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchUptimeData() {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: logs } = await supabase
        .from('service_status_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      setData((logs as ServiceStatusLog[]) || []);
      setLoading(false);
    }

    fetchUptimeData();
  }, [days, supabase]);

  return { data, loading };
}
