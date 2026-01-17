'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { Service, ServiceWithStatus, DailyStatusSummary, StatusType } from '@/types';

interface ServiceWithLatestLog extends Service {
  service_status_logs: { status: StatusType; timestamp: string }[];
}

export function useServices() {
  const [services, setServices] = useState<ServiceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchServices() {
      try {
        // 단일 JOIN 쿼리로 서비스 + 최신 상태 조회 (N+1 쿼리 제거)
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select(`
            *,
            service_status_logs(status, timestamp)
          `)
          .order('timestamp', { referencedTable: 'service_status_logs', ascending: false })
          .limit(1, { referencedTable: 'service_status_logs' });

        if (servicesError) throw servicesError;

        // 데이터 변환
        const servicesWithStatus = ((servicesData as ServiceWithLatestLog[]) || []).map((service) => {
          const latestLog = service.service_status_logs?.[0];
          return {
            id: service.id,
            name: service.name,
            url: service.url,
            threshold_ms: service.threshold_ms,
            created_at: service.created_at,
            currentStatus: latestLog?.status ?? 'OK',
            lastChecked: latestLog?.timestamp ?? null,
          } as ServiceWithStatus;
        });

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

export type SummaryByDate = Map<string, DailyStatusSummary[]>;

export function useUptimeData(days: number = 90) {
  const [data, setData] = useState<DailyStatusSummary[]>([]);
  const [summaryByDate, setSummaryByDate] = useState<SummaryByDate>(new Map());
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchUptimeData() {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: summary } = await supabase
        .from('daily_status_summary')
        .select(`
          *,
          services:service_id (name, url)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      const summaryData = (summary as DailyStatusSummary[]) || [];

      // 날짜별 Map 구조로 사전 처리
      const dateMap = new Map<string, DailyStatusSummary[]>();
      summaryData.forEach((item) => {
        if (!dateMap.has(item.date)) {
          dateMap.set(item.date, []);
        }
        dateMap.get(item.date)!.push(item);
      });

      setData(summaryData);
      setSummaryByDate(dateMap);
      setLoading(false);
    }

    fetchUptimeData();
  }, [days, supabase]);

  return { data, summaryByDate, loading };
}
