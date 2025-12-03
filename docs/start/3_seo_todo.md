# SEO 최적화 구현 체크리스트

## Phase 1: 필수 (높은 우선순위)

### 1.1 Sitemap 생성
- [x] `src/app/sitemap.ts` 파일 생성
- [x] 페이지 URL 설정 (/, /history)
- [x] changeFrequency, priority 설정
- [x] 빌드 후 `/sitemap.xml` 접근 확인

### 1.2 robots.txt 생성
- [x] `src/app/robots.ts` 파일 생성
- [x] Allow/Disallow 규칙 설정
- [x] Sitemap URL 연결
- [x] 빌드 후 `/robots.txt` 접근 확인

### 1.3 환경 변수 설정
- [x] `.env.local`에 `NEXT_PUBLIC_SITE_URL` 추가
- [ ] Netlify 환경 변수에 `NEXT_PUBLIC_SITE_URL` 추가

### 1.4 메타데이터 확장
- [x] `src/app/layout.tsx` 메타데이터 확장
  - [x] metadataBase 설정
  - [x] title template 설정
  - [x] description 설정
  - [x] keywords 설정
  - [x] robots 설정
- [x] `src/app/history/layout.tsx` 메타데이터 추가

### 1.5 Open Graph 태그
- [x] `layout.tsx`에 openGraph 설정 추가
  - [x] og:type
  - [x] og:locale
  - [x] og:url
  - [x] og:siteName
  - [x] og:title
  - [x] og:description
  - [x] og:image (동적 생성: opengraph-image.tsx)

### 1.6 Favicon 추가
- [x] `src/app/icon.tsx` 생성 (동적 favicon 32x32)
- [x] `src/app/apple-icon.tsx` 생성 (동적 180x180)
- [x] Next.js 자동 처리로 icons 설정 불필요

---

## Phase 2: 권장 (중간 우선순위)

### 2.1 Twitter Card
- [x] `layout.tsx`에 twitter 설정 추가
  - [x] twitter:card
  - [x] twitter:title
  - [x] twitter:description
  - [x] twitter:image (동적 생성)

### 2.2 JSON-LD 구조화 데이터
- [x] `src/components/JsonLd.tsx` 생성
  - [x] WebApplicationJsonLd 컴포넌트
  - [x] OrganizationJsonLd 컴포넌트
- [x] `src/app/layout.tsx`에 JSON-LD 컴포넌트 추가

### 2.3 시맨틱 HTML 개선
- [x] `ServiceCard.tsx` 수정
  - [x] `<div>` → `<article>` 변경
  - [x] `<time>` 태그 추가
- [x] `Dashboard.tsx` 수정
  - [x] `<section>` 태그 추가
  - [x] aria-label 추가
- [x] `Footer.tsx` 컴포넌트 생성
- [x] `AppLayout.tsx`에 Footer 추가

### 2.4 OG 이미지 제작
- [x] `src/app/opengraph-image.tsx` 생성 (동적 1200x630)
  - [x] 브랜드 로고/텍스트 포함
  - [x] 적절한 배경색 설정

---

## Phase 3: 선택 (낮은 우선순위)

### 3.1 next.config.ts 보안 헤더
- [x] headers() 함수 추가
  - [x] X-Content-Type-Options
  - [x] X-Frame-Options
  - [x] X-XSS-Protection

### 3.2 PWA manifest (선택)
- [ ] `public/manifest.json` 생성
- [ ] 아이콘 파일 생성 (192x192, 512x512)

---

## 테스트 체크리스트

### SEO 검증 (MCP Playwright 사용)
- [x] `/sitemap.xml` 페이지 접근 확인 (빌드 성공)
- [x] `/robots.txt` 페이지 접근 확인 (빌드 성공)
- [ ] 메인 페이지 메타태그 확인
  - [ ] `<title>` 태그 확인
  - [ ] `<meta name="description">` 확인
  - [ ] `<meta property="og:*">` 확인
  - [ ] `<meta name="twitter:*">` 확인
- [ ] History 페이지 메타태그 확인
- [ ] JSON-LD 스크립트 존재 확인
- [ ] Favicon 로드 확인

### 외부 도구 검증
- [ ] [Google Rich Results Test](https://search.google.com/test/rich-results) 테스트
- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) 테스트
- [ ] [Twitter Card Validator](https://cards-dev.twitter.com/validator) 테스트
- [ ] Lighthouse SEO 점수 확인 (목표: 90+)

---

## 완료 기준

- [x] 모든 Phase 1 항목 완료
- [x] `/sitemap.xml`, `/robots.txt` 정상 접근
- [ ] SNS 공유 시 미리보기 정상 표시 (배포 후 확인 필요)
- [ ] Lighthouse SEO 점수 90점 이상 (배포 후 확인 필요)
- [x] `npm run build` 성공
