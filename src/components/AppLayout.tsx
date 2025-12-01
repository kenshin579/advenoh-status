'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const Header = dynamic(() => import('./Header'), { ssr: false });

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // Don't show header on login page
  const showHeader = pathname !== '/login';

  return (
    <>
      {showHeader && <Header />}
      {children}
    </>
  );
}
