# 📄 PRD — Google Analytics 연동

## 1. 프로젝트 개요

본 문서는 Advenoh Status 모니터링 서비스에 Google Analytics 4(GA4)를 연동하기 위한 요구사항을 정의한다.

사용자 트래픽 분석, 페이지 조회 추적, 사용자 행동 분석을 통해 서비스 개선에 필요한 인사이트를 확보한다.

---

## 2. 목표

- Google Analytics 4 연동으로 사용자 트래픽 데이터 수집
- 페이지 조회 및 사용자 행동 추적
- Next.js App Router에 최적화된 방식으로 구현

---

## 3. 현재 상태 분석

### 3.1 구현 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| Google Analytics | 미구현 | ❌ |
| 페이지 조회 추적 | 미구현 | ❌ |
| 이벤트 추적 | 미구현 | ❌ |

### 3.2 참고 프로젝트 분석 (v2.advenoh.pe.kr)

참고 프로젝트에서는 다음과 같이 구현되어 있음:

```tsx
// components/GoogleAnalytics.tsx
import Script from 'next/script'

export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-4JL7C22JKN"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-4JL7C22JKN');
        `}
      </Script>
    </>
  )
}
```

- `next/script`의 `afterInteractive` 전략 사용
- 컴포넌트로 분리하여 재사용성 확보
- layout.tsx의 `<body>` 내부에서 호출

---

## 4. 주요 기능 요구사항

### 4.1 Google Analytics 컴포넌트 생성

#### 기능
- GA4 스크립트를 Next.js에 최적화된 방식으로 로드

#### 구현 항목

| 항목 | 설명 | 필수 |
|------|------|------|
| GoogleAnalytics 컴포넌트 | GA4 스크립트 로드 | ✅ |
| next/script 사용 | 성능 최적화된 스크립트 로드 | ✅ |
| afterInteractive 전략 | 페이지 로드 후 스크립트 실행 | ✅ |

#### GA4 측정 ID

```
G-8GWRJHNF6T
```

---

### 4.2 layout.tsx 수정

#### 변경 사항
- GoogleAnalytics 컴포넌트 import
- `<body>` 태그 내부에 컴포넌트 추가

#### 위치
- `<body>` 태그 시작 직후 (AppLayout 앞)

---

## 5. 구현 상세

### 5.1 파일 구조

```
advenoh-status/
├── src/
│   ├── app/
│   │   └── layout.tsx           # 수정 (GoogleAnalytics 추가)
│   └── components/
│       └── GoogleAnalytics.tsx  # 신규
```

### 5.2 GoogleAnalytics.tsx 구현 명세

```tsx
// src/components/GoogleAnalytics.tsx
import Script from 'next/script';

export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-8GWRJHNF6T"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-8GWRJHNF6T');
        `}
      </Script>
    </>
  );
}
```

### 5.3 layout.tsx 수정 명세

```tsx
// src/app/layout.tsx (수정 부분)
import GoogleAnalytics from '@/components/GoogleAnalytics';

// ... 기존 코드 ...

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* 기존 head 내용 */}
      </head>
      <body className={...}>
        <GoogleAnalytics />  {/* 추가 */}
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
```

---

## 6. 구현 우선순위

### Phase 1: 필수 (높은 우선순위)

| # | 항목 | 난이도 | 비고 |
|---|------|--------|------|
| 1 | GoogleAnalytics.tsx 컴포넌트 생성 | 쉬움 | 신규 파일 |
| 2 | layout.tsx 수정 | 쉬움 | 컴포넌트 추가 |

### Phase 2: 선택 (낮은 우선순위)

| # | 항목 | 난이도 | 비고 |
|---|------|--------|------|
| 1 | 커스텀 이벤트 추적 | 중간 | 클릭, 스크롤 등 |
| 2 | 페이지뷰 이벤트 추적 | 중간 | App Router 라우팅 추적 |

---

## 7. 기대 효과

| 항목 | 효과 |
|------|------|
| 트래픽 분석 | 방문자 수, 페이지뷰, 세션 시간 등 측정 |
| 사용자 행동 | 어떤 페이지가 인기 있는지 파악 |
| 지역 분석 | 방문자 지역 분포 확인 |
| 기기 분석 | 데스크톱/모바일 비율 확인 |
| 유입 경로 | 검색, 직접 방문, 외부 링크 분석 |

---

## 8. 검증 방법

### 8.1 개발 환경 테스트

1. 브라우저 개발자 도구 > Network 탭에서 `gtag/js` 요청 확인
2. Console에서 `window.dataLayer` 객체 확인

### 8.2 프로덕션 테스트

1. Google Analytics 실시간 리포트에서 활성 사용자 확인
2. 배포 후 24시간 내 데이터 수집 시작 확인

### 8.3 확인 명령어

```bash
# 빌드 후 gtag 스크립트 포함 확인
npm run build
grep -r "googletagmanager" .next/
```

---

## 9. 참고 자료

- [Google Analytics 4 설정 가이드](https://support.google.com/analytics/answer/9304153)
- [Next.js Script Component](https://nextjs.org/docs/app/api-reference/components/script)
- [GA4 이벤트 추적](https://developers.google.com/analytics/devguides/collection/ga4/events)
