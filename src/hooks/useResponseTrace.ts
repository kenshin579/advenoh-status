'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { toLocalDateString } from '@/lib/dateUtils';
import type { ResponseTracePoint } from '@/types';

export function useResponseTrace(serviceId: string | null, days = 30) {
  const [points, setPoints] = useState<ResponseTracePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!serviceId) {
      setPoints([]);
      setLoading(false);
      return;
    }

    async function fetchTrace() {
      // 일별 평균은 daily_status_summary 에 이미 집계돼 있다(KST 날짜 버킷).
      // 로그 원본을 읽으면 30일치가 PostgREST Max Rows(1000)를 넘어 최근 날짜가 잘린다.
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - days);

      const { data } = await supabase
        .from('daily_status_summary')
        .select('date, avg_response_time')
        .eq('service_id', serviceId)
        .gte('date', toLocalDateString(startDate))
        .order('date', { ascending: true });

      const avgByDate = new Map<string, number>();
      ((data as { date: string; avg_response_time: number | null }[] | null) || []).forEach((row) => {
        if (row.avg_response_time != null) avgByDate.set(row.date, row.avg_response_time);
      });

      const result: ResponseTracePoint[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = toLocalDateString(d);
        result.push({ date: key, avgMs: avgByDate.get(key) ?? 0 });
      }

      setPoints(result);
      setLoading(false);
    }

    fetchTrace();
  }, [serviceId, days, supabase]);

  return { points, loading };
}
