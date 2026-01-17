-- 005_cascade_delete_service_logs.sql
-- 서비스 삭제 시 관련 로그가 자동으로 삭제되도록 CASCADE DELETE 추가

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
