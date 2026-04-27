'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
  href: string;
  label: string;
}

const menuItems: MenuItem[] = [
  { href: '/admin', label: 'Service Management' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        borderRight: '1px solid var(--color-glass-border)',
        background: 'rgba(10, 5, 18, 0.35)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        minHeight: 'calc(100vh - 4rem)',
      }}
    >
      <div style={{ padding: 18 }}>
        <h2
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.24em',
            color: 'var(--color-cyan)',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          // ADMIN
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'block',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  background: isActive
                    ? 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))'
                    : 'transparent',
                  color: isActive ? '#fff' : 'var(--color-text-muted)',
                  boxShadow: isActive
                    ? '0 4px 16px color-mix(in srgb, var(--color-accent) 33%, transparent)'
                    : 'none',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
