'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';
import type { Incident, StatusType } from '@/types';

// get_status_transitions() RPC 반환 행 (직전 로그와 status 가 다른 행만)
interface TransitionRow {
  id: number;
  service_id: string;
  service_name: string | null;
  status: StatusType;
  timestamp: string;
  response_time: number | null;
  message: string | null;
}

export function useIncidents(days = 14) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchIncidents() {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 로그 원본은 PostgREST Max Rows(1000)를 넘으므로 상태 전환 행만 받는다.
      // incident 경계는 정의상 전환 지점이라 아래 계산 결과는 원본 로그로 계산한 것과 같다.
      // 전환이 많은(OK↔WARN 반복) 경우를 대비해 페이지네이션한다.
      const rows = await fetchAllRows<TransitionRow>(() =>
        supabase
          .rpc('get_status_transitions', { since: startDate.toISOString() })
          .order('service_id', { ascending: true })
          .order('timestamp', { ascending: true })
          .order('id', { ascending: true })
      );

      // service_id별로 그룹화 후 비-OK 연속 구간을 incident로 변환
      const grouped = new Map<string, TransitionRow[]>();
      rows.forEach((row) => {
        const arr = grouped.get(row.service_id) ?? [];
        arr.push(row);
        grouped.set(row.service_id, arr);
      });

      const result: Incident[] = [];

      grouped.forEach((logs, serviceId) => {
        let openIncident: {
          firstLog: TransitionRow;
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
              service: openIncident.firstLog.service_name ?? 'Unknown',
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
            service: openIncident.firstLog.service_name ?? 'Unknown',
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

    fetchIncidents().catch((err) => {
      // RPC 실패(예: migration 007 미적용)가 "장애 없음"으로 묻히지 않도록 원인을 남긴다
      console.error('useIncidents: failed to fetch status transitions', err);
      setIncidents([]);
      setLoading(false);
    });
  }, [days, supabase]);

  return { incidents, loading };
}
