'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { Incident, StatusType } from '@/types';

interface RawLog {
  id: number;
  service_id: string;
  status: StatusType;
  timestamp: string;
  response_time: number | null;
  message: string | null;
  services: { name: string } | null;
}

export function useIncidents(days = 14) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchIncidents() {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data } = await supabase
        .from('service_status_logs')
        .select(`
          id,
          service_id,
          status,
          timestamp,
          response_time,
          message,
          services:service_id (name)
        `)
        .gte('timestamp', startDate.toISOString())
        .order('service_id', { ascending: true })
        .order('timestamp', { ascending: true });

      const rows = (data as unknown as RawLog[]) || [];

      // service_id별로 그룹화 후 비-OK 연속 구간을 incident로 변환
      const grouped = new Map<string, RawLog[]>();
      rows.forEach((row) => {
        const arr = grouped.get(row.service_id) ?? [];
        arr.push(row);
        grouped.set(row.service_id, arr);
      });

      const result: Incident[] = [];

      grouped.forEach((logs, serviceId) => {
        let openIncident: {
          firstLog: RawLog;
          worstStatus: 'WARN' | 'ERROR';
        } | null = null;

        for (const log of logs) {
          const isBad = log.status === 'WARN' || log.status === 'ERROR';

          if (isBad) {
            const badStatus = log.status as 'WARN' | 'ERROR';
            if (!openIncident) {
              openIncident = { firstLog: log, worstStatus: badStatus };
            } else if (badStatus === 'ERROR') {
              openIncident.worstStatus = 'ERROR';
            }
          } else if (openIncident) {
            // OK 로그가 들어오면 인시던트 종료
            const started = openIncident.firstLog.timestamp;
            const resolved = log.timestamp;
            const duration = Math.round(
              (new Date(resolved).getTime() - new Date(started).getTime()) / 60000
            );
            result.push({
              id: `inc_${openIncident.firstLog.id}`,
              service_id: serviceId,
              service: openIncident.firstLog.services?.name ?? 'Unknown',
              status: openIncident.worstStatus,
              started,
              resolved,
              duration_min: duration,
              title:
                openIncident.worstStatus === 'ERROR'
                  ? 'Service unavailable'
                  : 'Elevated response time',
              body: openIncident.firstLog.message ?? undefined,
            });
            openIncident = null;
          }
        }

        // 진행 중인 인시던트 처리
        if (openIncident) {
          result.push({
            id: `inc_${openIncident.firstLog.id}`,
            service_id: serviceId,
            service: openIncident.firstLog.services?.name ?? 'Unknown',
            status: openIncident.worstStatus,
            started: openIncident.firstLog.timestamp,
            resolved: null,
            duration_min: null,
            title:
              openIncident.worstStatus === 'ERROR'
                ? 'Service unavailable (ongoing)'
                : 'Elevated response time (ongoing)',
            body: openIncident.firstLog.message ?? undefined,
          });
        }
      });

      // 최신순 정렬
      result.sort((a, b) => new Date(b.started).getTime() - new Date(a.started).getTime());

      setIncidents(result);
      setLoading(false);
    }

    fetchIncidents().catch(() => {
      setIncidents([]);
      setLoading(false);
    });
  }, [days, supabase]);

  return { incidents, loading };
}
