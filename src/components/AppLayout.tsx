'use client';

import dynamic from 'next/dynamic';

const Header = dynamic(() => import('./Header'), { ssr: false });

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
