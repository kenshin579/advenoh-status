import type { HTMLAttributes, ReactNode } from 'react';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  hi?: boolean;
  children: ReactNode;
}

export default function GlassPanel({
  hi = false,
  className = '',
  children,
  ...rest
}: GlassPanelProps) {
  const cls = ['glass-panel', hi ? 'glass-panel-hi' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
