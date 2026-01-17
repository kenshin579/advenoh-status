# 어드민 서비스 관리 기능 PRD

## 1. 개요

### 1.1 목적
로그인한 어드민 사용자가 모니터링 대상 서비스를 관리(추가/수정/삭제/조회)할 수 있는 어드민 페이지를 구현한다.

### 1.2 범위
- 어드민 전용 페이지 (`/admin`) 생성
- 좌측 사이드바 메뉴 구조
- 서비스 CRUD 기능

---

## 2. 현재 시스템 분석

### 2.1 기존 구조

#### 데이터베이스 (services 테이블)
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  threshold_ms INT DEFAULT 3000,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### TypeScript 타입
```typescript
interface Service {
  id: string;
  name: string;
  url: string;
  threshold_ms: number;
  created_at: string;
}
```

#### RLS 정책 (현재)
- services: **읽기만 공개** (INSERT/UPDATE/DELETE 없음)
- users: authenticated 사용자만 자신의 정보 조회 가능

### 2.2 인증 시스템
- `useAuth` 훅으로 로그인 상태 관리
- users 테이블에 등록된 사용자만 로그인 가능
- role 필드로 권한 구분 (현재 'admin'만 존재)

---

## 3. 요구사항

### 3.1 페이지 레이아웃

```
+------------------------------------------+
|              Header                       |
+----------+-------------------------------+
|          |                               |
| Sidebar  |      Content Area             |
|          |                               |
| - 서비스  |   (선택된 메뉴에 따른 콘텐츠)   |
|   관리    |                               |
|          |                               |
+----------+-------------------------------+
```

#### 좌측 사이드바
- 메뉴 항목: **서비스 관리** (현재 단일 메뉴)
- 향후 확장 가능한 구조로 설계
- 현재 선택된 메뉴 하이라이트

#### 우측 콘텐츠 영역
- 선택된 메뉴에 따라 동적으로 콘텐츠 표시
- 기본값: 서비스 관리

### 3.2 서비스 관리 기능

#### 3.2.1 서비스 목록 조회
| 항목 | 설명 |
|------|------|
| 테이블 형태 | 서비스명, URL, Threshold, 생성일, 액션 버튼 |
| 정렬 | 생성일 내림차순 (최신순) |
| 빈 상태 | "등록된 서비스가 없습니다" 메시지 표시 |

#### 3.2.2 서비스 추가
| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| name | text | O | - | 서비스명 |
| url | text | O | - | 모니터링 URL (https:// 형식) |
| threshold_ms | number | X | 3000 | 응답시간 임계값 (ms) |

- 모달 또는 인라인 폼으로 구현
- URL 형식 검증
- 중복 URL 검사

#### 3.2.3 서비스 수정
- 기존 서비스 정보를 폼에 로드
- 수정 가능 필드: name, url, threshold_ms
- 수정 불가 필드: id, created_at

#### 3.2.4 서비스 삭제
- 삭제 확인 다이얼로그 표시
- 관련 service_status_logs도 CASCADE 삭제됨 (DB 레벨)

### 3.3 접근 제어

#### 페이지 접근
- 로그인하지 않은 사용자: 로그인 페이지로 리다이렉트 또는 접근 차단
- 로그인한 사용자: 어드민 페이지 접근 허용

#### API 수준 보안
- RLS 정책으로 authenticated + users 테이블 검증 필요
- 서비스 CRUD 작업은 admin role만 가능

---

## 4. 기술 설계

### 4.1 라우팅 구조

```
/admin                    → 어드민 레이아웃 + 서비스 관리 (기본)
/admin/services           → 서비스 관리 (명시적 경로)
```

### 4.2 컴포넌트 구조

```
src/
├── app/
│   └── admin/
│       ├── layout.tsx          # 어드민 레이아웃 (사이드바 포함)
│       └── page.tsx            # 서비스 관리 페이지
├── components/
│   └── admin/
│       ├── AdminSidebar.tsx    # 좌측 사이드바
│       ├── ServiceList.tsx     # 서비스 목록 테이블
│       ├── ServiceForm.tsx     # 추가/수정 폼 (모달)
│       └── DeleteConfirmModal.tsx # 삭제 확인 모달
└── hooks/
    └── useAdminServices.ts     # 서비스 CRUD 훅
```

### 4.3 데이터베이스 변경

#### RLS 정책 추가 (services 테이블)

```sql
-- Admin 사용자만 서비스 추가 가능
CREATE POLICY "Admin can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'admin'
    )
  );

-- Admin 사용자만 서비스 수정 가능
CREATE POLICY "Admin can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'admin'
    )
  );

-- Admin 사용자만 서비스 삭제 가능
CREATE POLICY "Admin can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'admin'
    )
  );
```

### 4.4 useAdminServices 훅 API

```typescript
interface UseAdminServicesReturn {
  services: Service[];
  loading: boolean;
  error: string | null;

  // CRUD 메서드
  createService: (data: CreateServiceInput) => Promise<boolean>;
  updateService: (id: string, data: UpdateServiceInput) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;

  // 상태 리프레시
  refresh: () => Promise<void>;
}

interface CreateServiceInput {
  name: string;
  url: string;
  threshold_ms?: number;
}

interface UpdateServiceInput {
  name?: string;
  url?: string;
  threshold_ms?: number;
}
```

---

## 5. UI/UX 상세

### 5.1 사이드바 디자인

```
+-------------------+
| Admin             |
+-------------------+
| > 서비스 관리      |  ← 활성 상태 (파란색 배경)
|   ...             |  ← 향후 메뉴 확장 가능
+-------------------+
```

- 너비: 240px (고정)
- 배경: 밝은 회색 (#f9fafb)
- 활성 메뉴: 파란색 배경 + 흰색 텍스트

### 5.2 서비스 목록 테이블

| 서비스명 | URL | Threshold | 생성일 | 액션 |
|----------|-----|-----------|--------|------|
| Inspire Me | https://inspire-me... | 3000ms | 2024-01-01 | 수정 / 삭제 |

### 5.3 서비스 추가/수정 모달

```
+----------------------------------+
|  서비스 추가                      |
+----------------------------------+
|  서비스명 *                       |
|  [                          ]    |
|                                  |
|  URL *                           |
|  [https://                  ]    |
|                                  |
|  Threshold (ms)                  |
|  [3000                      ]    |
|                                  |
|  [취소]              [저장]       |
+----------------------------------+
```

### 5.4 삭제 확인 모달

```
+----------------------------------+
|  서비스 삭제                      |
+----------------------------------+
|                                  |
|  "Inspire Me" 서비스를 삭제하시   |
|  겠습니까?                        |
|                                  |
|  삭제 시 관련 상태 로그도 함께     |
|  삭제됩니다.                      |
|                                  |
|  [취소]              [삭제]       |
+----------------------------------+
```

---

## 6. 에러 처리

| 상황 | 처리 방식 |
|------|----------|
| 네트워크 오류 | 토스트 메시지로 알림 |
| 권한 없음 (RLS 실패) | "권한이 없습니다" 메시지 |
| 중복 URL | "이미 등록된 URL입니다" 메시지 |
| 유효성 검사 실패 | 필드 하단에 에러 메시지 표시 |

---

## 7. 구현 단계

### Phase 1: 기본 구조
1. 어드민 레이아웃 생성 (`/admin/layout.tsx`)
2. 사이드바 컴포넌트 구현
3. 서비스 관리 페이지 기본 구조

### Phase 2: 서비스 CRUD
1. RLS 정책 추가 (마이그레이션)
2. useAdminServices 훅 구현
3. 서비스 목록 테이블 구현
4. 추가/수정 모달 구현
5. 삭제 확인 모달 구현

### Phase 3: 접근 제어
1. 로그인 체크 및 리다이렉트
2. Header에 Admin 링크 추가 (로그인 시만 표시)

### Phase 4: 테스트
1. E2E 테스트 작성
2. 에러 케이스 테스트

---

## 8. 파일 변경 예상

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `supabase/migrations/003_add_admin_policies.sql` | 신규 | RLS 정책 추가 |
| `src/app/admin/layout.tsx` | 신규 | 어드민 레이아웃 |
| `src/app/admin/page.tsx` | 신규 | 서비스 관리 페이지 |
| `src/components/admin/AdminSidebar.tsx` | 신규 | 사이드바 |
| `src/components/admin/ServiceList.tsx` | 신규 | 서비스 목록 |
| `src/components/admin/ServiceForm.tsx` | 신규 | 추가/수정 폼 |
| `src/components/admin/DeleteConfirmModal.tsx` | 신규 | 삭제 확인 |
| `src/hooks/useAdminServices.ts` | 신규 | CRUD 훅 |
| `src/components/Header.tsx` | 수정 | Admin 링크 추가 |
