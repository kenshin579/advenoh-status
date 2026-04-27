'use client';

import { useServices } from './useServices';
import type { StatusType } from '@/types';

export function useOverallStatus(): { status: StatusType; loading: boolean } {
  const { services, loading } = useServices();

  if (services.some((s) => s.currentStatus === 'ERROR')) {
    return { status: 'ERROR', loading };
  }
  if (services.some((s) => s.currentStatus === 'WARN')) {
    return { status: 'WARN', loading };
  }
  return { status: 'OK', loading };
}
