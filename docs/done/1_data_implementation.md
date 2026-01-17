# 서비스 삭제 시 데이터 정합성 개선 - 구현 문서

## 1. 구현 개요

서비스 삭제 시 관련 로그가 자동으로 삭제되도록 `ON DELETE CASCADE` 제약 조건을 추가한다.

## 2. 파일 변경 사항

### 2.1 새 파일 생성

| 파일 | 설명 |
|-----|------|
| `supabase/migrations/005_cascade_delete_service_logs.sql` | CASCADE DELETE 마이그레이션 |

## 3. 구현 상세

### 3.1 Migration SQL

```sql
-- 005_cascade_delete_service_logs.sql

-- 1. 기존 orphan 로그 삭제 (삭제된 서비스를 참조하는 로그)
DELETE FROM service_status_logs
WHERE service_id NOT IN (SELECT id FROM services);

-- 2. 기존 외래 키 제약 조건 삭제
ALTER TABLE service_status_logs
DROP CONSTRAINT IF EXISTS service_status_logs_service_id_fkey;

-- 3. CASCADE DELETE 옵션으로 외래 키 재생성
ALTER TABLE service_status_logs
ADD CONSTRAINT service_status_logs_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
```

## 4. 적용 방법

### 4.1 Supabase Dashboard에서 직접 실행
1. Supabase Dashboard > SQL Editor 접속
2. 위 SQL 실행

### 4.2 또는 Supabase CLI 사용
```bash
supabase db push
```
