# 서비스 삭제 시 데이터 정합성 개선 PRD

## 1. 배경

### 문제 현상
- Supabase DB에는 2025-12-14부터 3,444개의 로그가 존재
- 프론트엔드(Dashboard, History 페이지)에서는 2026-01-09 이후 데이터만 표시
- 약 25일간의 데이터가 누락되어 보임

### 근본 원인
- 관리자가 서비스를 삭제 후 재생성하면 **새로운 UUID**가 할당됨
- 이전 로그들은 **삭제된 서비스의 UUID**를 `service_id`로 참조
- 프론트엔드 쿼리에서 `services` 테이블과 JOIN 시 orphan 로그가 제외됨

### 영향 범위
- Dashboard 페이지: 90일 업타임 그리드에서 과거 데이터 누락
- History 페이지: 월별 캘린더에서 과거 데이터 누락

## 2. 요구사항

### 2.1 DB 스키마 수정
- `service_status_logs.service_id` 외래 키에 `ON DELETE CASCADE` 제약 조건 추가
- 서비스 삭제 시 관련 로그가 자동으로 삭제되도록 함

### 2.2 기존 orphan 데이터 정리
- 현재 존재하는 orphan 로그(삭제된 서비스를 참조하는 로그) 삭제

## 3. 구현 방안

### 3.1 Migration SQL

```sql
-- 1. 기존 orphan 로그 삭제
DELETE FROM service_status_logs
WHERE service_id NOT IN (SELECT id FROM services);

-- 2. 기존 외래 키 제약 조건 삭제 후 CASCADE로 재생성
ALTER TABLE service_status_logs
DROP CONSTRAINT IF EXISTS service_status_logs_service_id_fkey;

ALTER TABLE service_status_logs
ADD CONSTRAINT service_status_logs_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
```

### 3.2 파일 위치
- `supabase/migrations/005_cascade_delete_service_logs.sql`

## 4. 테스트 시나리오

| # | 시나리오 | 예상 결과 |
|---|---------|----------|
| 1 | 서비스 삭제 | 해당 서비스의 모든 로그가 자동 삭제됨 |
| 2 | 삭제 후 Dashboard 확인 | 삭제된 서비스 관련 데이터가 표시되지 않음 |
| 3 | 삭제 후 History 확인 | orphan 데이터 없이 정상 표시됨 |

## 5. 대안 검토

### 대안: 로그 보존 + 쿼리 수정
- 삭제된 서비스의 로그를 "Unknown Service"로 표시
- 장점: 히스토리 데이터 보존
- 단점: 의미 없는 데이터 누적, 쿼리 복잡도 증가

### 선택: CASCADE DELETE
- 삭제된 서비스의 로그는 더 이상 의미가 없음
- 데이터 정합성 유지 및 쿼리 단순화
