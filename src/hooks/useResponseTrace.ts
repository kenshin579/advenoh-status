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
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - days);

      const { data } = await supabase
        .from('service_status_logs')
        .select('timestamp, response_time')
        .eq('service_id', serviceId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      const buckets = new Map<string, { sum: number; count: number }>();
      ((data as { timestamp: string; response_time: number | null }[] | null) || []).forEach((row) => {
        if (row.response_time == null) return;
        const dateKey = toLocalDateString(new Date(row.timestamp));
        const bucket = buckets.get(dateKey) ?? { sum: 0, count: 0 };
        bucket.sum += row.response_time;
        bucket.count += 1;
        buckets.set(dateKey, bucket);
      });

      const result: ResponseTracePoint[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = toLocalDateString(d);
        const bucket = buckets.get(key);
        result.push({
          date: key,
          avgMs: bucket ? Math.round(bucket.sum / bucket.count) : 0,
        });
      }

      setPoints(result);
      setLoading(false);
    }

    fetchTrace();
  }, [serviceId, days, supabase]);

  return { points, loading };
}
