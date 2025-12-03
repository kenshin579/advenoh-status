# 📄 PRD — SEO 최적화

## 1. 프로젝트 개요

본 문서는 Advenoh Status 모니터링 서비스의 SEO(검색 엔진 최적화) 개선을 위한 요구사항을 정의한다.

현재 웹사이트는 기본적인 메타데이터만 설정되어 있으며, 검색 엔진 크롤링 효율화 및 소셜 미디어 공유 최적화를 위한 추가 작업이 필요하다.

---

## 2. 목표

- 검색 엔진(Google, Naver 등)의 크롤링 효율 향상
- 소셜 미디어 공유 시 풍부한 미리보기 제공
- 검색 결과에서 Rich Snippet 표시
- 웹 표준 및 접근성 향상

---

## 3. 현재 상태 분석

### 3.1 현재 SEO 점수: 약 40/100

### 3.2 구현 현황

| 항목 | 상태 | 평가 |
|------|------|------|
| 메타데이터 (title, description) | 기본만 설정 | ⚠️ |
| Open Graph 태그 | 미구현 | ❌ |
| Twitter Card | 미구현 | ❌ |
| Sitemap | 미구현 | ❌ |
| robots.txt | 미구현 | ❌ |
| 시맨틱 HTML | 부분 구현 | ⚠️ |
| JSON-LD 구조화 데이터 | 미구현 | ❌ |
| Favicon | 미구현 | ❌ |
| URL 구조 | 양호 | ✅ |

### 3.3 현재 메타데이터 설정

```tsx
// src/app/layout.tsx
export const metadata: Metadata = {
  title: 'Advenoh Status',
  description: 'System Server Monitoring Service',
};
```

---

## 4. 주요 기능 요구사항

### 4.1 메타데이터 확장

#### 기능
- 전역 메타데이터 확장 (layout.tsx)
- 페이지별 고유 메타데이터 설정
- Canonical URL 설정

#### 구현 항목

| 메타데이터 | 설명 | 필수 |
|-----------|------|------|
| title | 페이지 제목 | ✅ |
| description | 페이지 설명 | ✅ |
| keywords | 검색 키워드 | 선택 |
| author | 작성자 | 선택 |
| robots | 크롤링 지시 | ✅ |
| canonical | 정규 URL | ✅ |
| viewport | 뷰포트 설정 | ✅ |
| themeColor | 테마 색상 | 선택 |

#### 페이지별 메타데이터

| 페이지 | title | description |
|--------|-------|-------------|
| / | Advenoh Status - 시스템 모니터링 | 실시간 서비스 상태 모니터링 대시보드 |
| /history | Uptime History - Advenoh Status | 서비스 가동 시간 이력 및 월별 통계 |

---

### 4.2 Sitemap & robots.txt

#### 기능
- 동적 Sitemap 생성 (Next.js App Router 방식)
- robots.txt 파일 생성

#### Sitemap 요구사항

| 항목 | 값 |
|------|-----|
| 파일 위치 | src/app/sitemap.ts |
| 포함 페이지 | /, /history |
| changeFrequency | daily |
| priority | 1.0 (홈), 0.8 (history) |

#### robots.txt 요구사항

```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://[도메인]/sitemap.xml
```

---

### 4.3 Open Graph & Twitter Card

#### 기능
- 소셜 미디어 공유 시 미리보기 이미지 및 정보 표시
- Facebook, LinkedIn, Twitter 등 지원

#### Open Graph 태그

| 태그 | 값 | 필수 |
|------|-----|------|
| og:title | 페이지 제목 | ✅ |
| og:description | 페이지 설명 | ✅ |
| og:image | /og-image.png (1200x630px) | ✅ |
| og:url | 페이지 URL | ✅ |
| og:type | website | ✅ |
| og:site_name | Advenoh Status | 선택 |
| og:locale | ko_KR | 선택 |

#### Twitter Card 태그

| 태그 | 값 | 필수 |
|------|-----|------|
| twitter:card | summary_large_image | ✅ |
| twitter:title | 페이지 제목 | ✅ |
| twitter:description | 페이지 설명 | ✅ |
| twitter:image | /og-image.png | ✅ |

---

### 4.4 JSON-LD 구조화 데이터

#### 기능
- Google Rich Snippet 표시를 위한 구조화된 데이터
- Schema.org 표준 준수

#### 스키마 타입

| 스키마 | 적용 페이지 | 설명 |
|--------|------------|------|
| WebApplication | / | 모니터링 앱 정보 |
| Organization | 전역 | 조직 정보 |
| BreadcrumbList | 전역 | 네비게이션 구조 |

#### WebApplication 스키마 예시

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Advenoh Status",
  "description": "System Server Monitoring Service",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web Browser"
}
```

---

### 4.5 시맨틱 HTML 개선

#### 기능
- 접근성 및 SEO를 위한 시맨틱 태그 사용

#### 개선 항목

| 현재 | 개선 | 적용 위치 |
|------|------|----------|
| `<div>` | `<article>` | ServiceCard 컴포넌트 |
| `<div>` | `<section>` | Dashboard 섹션 구분 |
| 없음 | `<footer>` | 페이지 하단 |
| `<div>` | `<time>` | 날짜/시간 표시 |

#### 적용 파일

- src/components/ServiceCard.tsx
- src/components/Dashboard.tsx
- src/app/layout.tsx (footer 추가)

---

### 4.6 Favicon & 이미지 자산

#### 기능
- 브라우저 탭 아이콘 표시
- Apple Touch Icon 지원
- Open Graph 이미지

#### 필요 파일

| 파일 | 크기 | 위치 |
|------|------|------|
| favicon.ico | 32x32 | public/ 또는 src/app/ |
| apple-touch-icon.png | 180x180 | public/ |
| og-image.png | 1200x630 | public/ |
| icon-192.png | 192x192 | public/ (PWA용, 선택) |
| icon-512.png | 512x512 | public/ (PWA용, 선택) |

---

### 4.7 next.config.ts 설정

#### 추가 설정

```typescript
const nextConfig: NextConfig = {
  // 보안 헤더
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
```

---

## 5. 구현 우선순위

### Phase 1: 필수 (높은 우선순위)

| # | 항목 | 난이도 | 예상 효과 |
|---|------|--------|----------|
| 1 | sitemap.ts 생성 | 쉬움 | 크롤링 효율 ↑ |
| 2 | robots.txt 생성 | 쉬움 | 크롤러 지시 |
| 3 | 메타데이터 확장 | 중간 | 검색 결과 품질 ↑ |
| 4 | Open Graph 태그 | 중간 | SNS 공유율 ↑ |
| 5 | Favicon 추가 | 쉬움 | 브랜드 인지도 |

### Phase 2: 권장 (중간 우선순위)

| # | 항목 | 난이도 | 예상 효과 |
|---|------|--------|----------|
| 1 | Twitter Card | 쉬움 | 트위터 공유 |
| 2 | JSON-LD 스키마 | 중간 | Rich Snippet |
| 3 | 시맨틱 HTML 개선 | 중간 | 접근성 ↑ |
| 4 | OG 이미지 제작 | 중간 | 시각적 미리보기 |

### Phase 3: 선택 (낮은 우선순위)

| # | 항목 | 난이도 | 비고 |
|---|------|--------|------|
| 1 | next.config 헤더 | 쉬움 | 보안 강화 |
| 2 | PWA manifest | 중간 | 오프라인 지원 시 |
| 3 | 다국어 hreflang | 높음 | 다국어 지원 시 |

---

## 6. 기대 효과

| 개선 항목 | 예상 효과 |
|----------|----------|
| Sitemap + robots.txt | 검색 엔진 크롤링 효율 30-40% 향상 |
| Open Graph + Twitter Card | SNS 공유 클릭률 20-30% 증가 |
| JSON-LD | Google Rich Snippet 표시 가능 |
| 시맨틱 HTML | 접근성 점수 향상 |
| Favicon | 브랜드 인지도 향상 |

---

## 7. 파일 구조 (구현 후)

```
advenoh-status/
├── public/
│   ├── favicon.ico          # 신규
│   ├── apple-touch-icon.png # 신규
│   ├── og-image.png         # 신규
│   └── robots.txt           # 신규
├── src/
│   ├── app/
│   │   ├── layout.tsx       # 수정 (메타데이터 확장)
│   │   ├── page.tsx         # 수정 (JSON-LD 추가)
│   │   ├── sitemap.ts       # 신규
│   │   └── history/
│   │       └── page.tsx     # 수정 (메타데이터 추가)
│   └── components/
│       ├── ServiceCard.tsx  # 수정 (시맨틱 태그)
│       ├── Dashboard.tsx    # 수정 (시맨틱 태그)
│       └── Footer.tsx       # 신규
└── next.config.ts           # 수정 (헤더 설정)
```

---

## 8. 참고 자료

- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Open Graph Protocol](https://ogp.me/)
- [Schema.org](https://schema.org/)
- [Google Search Central](https://developers.google.com/search)
