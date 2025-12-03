import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Uptime History',
  description: '서비스 가동 시간 이력 및 월별 통계',
  openGraph: {
    title: 'Uptime History - Advenoh Status',
    description: '서비스 가동 시간 이력 및 월별 통계',
  },
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
