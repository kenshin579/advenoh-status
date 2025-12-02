'use client';

import type { StatusType } from '@/types';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  OK: {
    bg: 'bg-green-500',
    text: 'text-green-500',
    label: 'Operational',
  },
  WARN: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-500',
    label: 'Degraded',
  },
  ERROR: {
    bg: 'bg-red-500',
    text: 'text-red-500',
    label: 'Down',
  },
};

const sizeConfig = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClass = sizeConfig[size];

  return (
    <div className="flex items-center gap-2">
      <span className={`${config.bg} ${sizeClass} rounded-full`} />
      <span className={`${config.text} font-medium`}>{config.label}</span>
    </div>
  );
}
