# Bug Report: RLS 정책 위반으로 service_status_logs INSERT 실패

## 오류 메시지

```
Failed to save to database: {
  'message': 'new row violates row-level security policy for table "service_status_logs"',
  'code': '42501',
  'hint': None,
  'details': None
}
```

## 원인 분석

### 1. 문제 상황

GitHub Actions에서 `health_check.py` 실행 시, `service_status_logs` 테이블에 INSERT가 실패합니다.

### 2. 근본 원인

**RLS(Row Level Security) 정책에 INSERT 권한이 없음**

현재 `001_initial_schema.sql`의 RLS 정책:

```sql
-- service_status_logs 테이블 RLS (공개 읽기 허용)
ALTER TABLE service_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for logs"
  ON service_status_logs FOR SELECT  -- SELECT만 허용!
  TO anon, authenticated
  USING (true);
```

- `SELECT` 정책만 존재 (읽기 전용)
- `INSERT` 정책이 **없음** → 쓰기 불가

### 3. Supabase API 키 종류

| 키 종류 | RLS 적용 | 용도 |
|--------|---------|------|
| `anon` 키 | O (적용됨) | 클라이언트, 공개 읽기 |
| `service_role` 키 | X (우회) | 서버, 관리자 작업 |

현재 GitHub Actions에서 사용 중인 `ADVENOH_STATUS_SUPABASE_API_KEY`가 `anon` 키로 추정됩니다.

## 해결 방안

### 방안 1: service_role 키 사용 (권장)

GitHub Actions에서는 `service_role` 키를 사용해야 합니다. 이 키는 RLS를 우회하므로 INSERT가 가능합니다.

**적용 방법:**
1. Supabase Dashboard → Settings → API → `service_role` 키 복사
2. GitHub Secrets에 `ADVENOH_STATUS_SUPABASE_API_KEY` 값을 `service_role` 키로 업데이트

### 방안 2: INSERT 정책 추가 (대안)

`anon` 키를 계속 사용하려면 INSERT 정책을 추가해야 합니다:

```sql
-- 새 마이그레이션 파일: 002_add_insert_policy.sql

CREATE POLICY "Service can insert logs"
  ON service_status_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

**주의:** 이 방안은 누구나 로그를 삽입할 수 있게 되어 보안상 권장되지 않습니다.

## 권장 해결책

**방안 1 (service_role 키 사용)**을 권장합니다.

이유:
- 서버 측 작업(GitHub Actions)에서는 `service_role` 키가 표준
- INSERT 정책을 공개하면 악의적 데이터 삽입 위험
- CLAUDE.md 문서에도 `SUPABASE_SERVICE_KEY` 사용이 명시됨

## 적용 후 예상 결과

```
[OK] ArgoCD: 1110ms (HTTP 200) - changed: True
  -> Status saved to database  ✅
[OK] Inspire Me: 753ms (HTTP 200) - changed: True
  -> Status saved to database  ✅
```

## 참고

- PostgreSQL 에러 코드 `42501`: insufficient_privilege
- Supabase RLS 문서: https://supabase.com/docs/guides/auth/row-level-security
