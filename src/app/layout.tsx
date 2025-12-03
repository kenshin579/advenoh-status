import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import AppLayout from '@/components/AppLayout';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { WebApplicationJsonLd, OrganizationJsonLd } from '@/components/JsonLd';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://status.advenoh.pe.kr';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Advenoh Status - 시스템 모니터링',
    template: '%s | Advenoh Status',
  },
  description: '실시간 서비스 상태 모니터링 대시보드',
  keywords: ['모니터링', 'status', 'uptime', '서버 상태', 'advenoh'],
  authors: [{ name: 'Advenoh' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: BASE_URL,
    siteName: 'Advenoh Status',
    title: 'Advenoh Status - 시스템 모니터링',
    description: '실시간 서비스 상태 모니터링 대시보드',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Advenoh Status - 시스템 모니터링',
    description: '실시간 서비스 상태 모니터링 대시보드',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <WebApplicationJsonLd />
        <OrganizationJsonLd />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
