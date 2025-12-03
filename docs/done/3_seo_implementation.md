# SEO 최적화 구현 문서

## 개요

Next.js App Router 기반 SEO 최적화 구현 가이드

---

## 1. Sitemap 생성

### 파일: `src/app/sitemap.ts`

```typescript
import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://status.advenoh.pe.kr';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/history`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];
}
```

---

## 2. robots.txt 생성

### 파일: `src/app/robots.ts`

```typescript
import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://status.advenoh.pe.kr';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

---

## 3. 메타데이터 확장

### 파일: `src/app/layout.tsx`

```typescript
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://status.advenoh.pe.kr';

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
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Advenoh Status',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Advenoh Status - 시스템 모니터링',
    description: '실시간 서비스 상태 모니터링 대시보드',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};
```

### 파일: `src/app/history/page.tsx` (메타데이터 추가)

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Uptime History',
  description: '서비스 가동 시간 이력 및 월별 통계',
  openGraph: {
    title: 'Uptime History - Advenoh Status',
    description: '서비스 가동 시간 이력 및 월별 통계',
  },
};
```

---

## 4. JSON-LD 구조화 데이터

### 파일: `src/components/JsonLd.tsx`

```typescript
export function WebApplicationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Advenoh Status',
    description: 'System Server Monitoring Service',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://status.advenoh.pe.kr',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Advenoh',
    url: 'https://advenoh.pe.kr',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### 사용: `src/app/page.tsx`

```typescript
import { WebApplicationJsonLd, OrganizationJsonLd } from '@/components/JsonLd';

export default function Home() {
  return (
    <>
      <WebApplicationJsonLd />
      <OrganizationJsonLd />
      {/* 기존 컴포넌트 */}
    </>
  );
}
```

---

## 5. 시맨틱 HTML 개선

### ServiceCard 컴포넌트

```typescript
// 변경 전
<div className="bg-white rounded-lg ...">

// 변경 후
<article className="bg-white rounded-lg ...">
  <h2 className="text-lg font-semibold">{service.name}</h2>
  <time dateTime={lastChecked}>{formattedDate}</time>
</article>
```

### Dashboard 컴포넌트

```typescript
// 섹션 구분 추가
<section aria-label="서비스 상태">
  {services.map(service => (
    <ServiceCard key={service.id} service={service} />
  ))}
</section>
```

### Footer 컴포넌트 (`src/components/Footer.tsx`)

```typescript
export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-8">
      <div className="max-w-6xl mx-auto px-8 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Advenoh Status</p>
      </div>
    </footer>
  );
}
```

---

## 6. Favicon & 이미지 자산

### 필요 파일

| 파일 | 크기 | 위치 |
|------|------|------|
| favicon.ico | 32x32 | public/ |
| apple-touch-icon.png | 180x180 | public/ |
| og-image.png | 1200x630 | public/ |

### OG 이미지 디자인 권장사항

- 배경: 브랜드 컬러 또는 그라디언트
- 텍스트: "Advenoh Status" + 간단한 설명
- 아이콘: 모니터링/상태 관련 아이콘

---

## 7. next.config.ts 보안 헤더

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## 8. 환경 변수

### `.env.local` 추가

```
NEXT_PUBLIC_SITE_URL=https://status.advenoh.pe.kr
```

---

## 수정 파일 목록

| 파일 | 작업 |
|------|------|
| src/app/sitemap.ts | 신규 |
| src/app/robots.ts | 신규 |
| src/app/layout.tsx | 수정 |
| src/app/page.tsx | 수정 |
| src/app/history/page.tsx | 수정 |
| src/components/JsonLd.tsx | 신규 |
| src/components/Footer.tsx | 신규 |
| src/components/ServiceCard.tsx | 수정 |
| src/components/Dashboard.tsx | 수정 |
| next.config.ts | 수정 |
| public/favicon.ico | 신규 |
| public/apple-touch-icon.png | 신규 |
| public/og-image.png | 신규 |
