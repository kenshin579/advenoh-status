'use client';

import dynamic from 'next/dynamic';
import Footer from './Footer';
import ScanlinesOverlay from './ui/ScanlinesOverlay';

const Header = dynamic(() => import('./Header'), { ssr: false });

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <ScanlinesOverlay />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Header />
        {children}
        <Footer />
      </div>
    </>
  );
}
