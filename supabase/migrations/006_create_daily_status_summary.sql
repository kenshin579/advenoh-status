-- 006_create_daily_status_summary.sql
-- 일별 상태 요약 테이블 생성

-- 1. 테이블 생성
CREATE TABLE daily_status_summary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('OK', 'WARN', 'ERROR')),
  ok_count int DEFAULT 0,
  warn_count int DEFAULT 0,
  error_count int DEFAULT 0,
  avg_response_time int,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(service_id, date)
);

-- 2. 인덱스
CREATE INDEX idx_daily_status_summary_date ON daily_status_summary(date);
CREATE INDEX idx_daily_status_summary_service_date ON daily_status_summary(service_id, date);

-- 3. RLS 정책
ALTER TABLE daily_status_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily_status_summary"
  ON daily_status_summary FOR SELECT USING (true);

CREATE POLICY "Service role can manage daily_status_summary"
  ON daily_status_summary FOR ALL USING (true);

-- 4. 기존 데이터로 초기 summary 생성
INSERT INTO daily_status_summary (service_id, date, status, ok_count, warn_count, error_count, avg_response_time)
SELECT
  service_id,
  DATE(timestamp) as date,
  CASE
    WHEN COUNT(*) FILTER (WHERE status = 'ERROR') > 0 THEN 'ERROR'
    WHEN COUNT(*) FILTER (WHERE status = 'WARN') > 0 THEN 'WARN'
    ELSE 'OK'
  END as status,
  COUNT(*) FILTER (WHERE status = 'OK') as ok_count,
  COUNT(*) FILTER (WHERE status = 'WARN') as warn_count,
  COUNT(*) FILTER (WHERE status = 'ERROR') as error_count,
  AVG(response_time)::int as avg_response_time
FROM service_status_logs
GROUP BY service_id, DATE(timestamp)
ON CONFLICT (service_id, date) DO NOTHING;
