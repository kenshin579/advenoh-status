-- ============================================
-- 시스템 서버 모니터링 서비스 - 초기 스키마
-- ============================================

-- services 테이블: 모니터링 대상 서비스
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  threshold_ms INT DEFAULT 3000,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- service_status_logs 테이블: 상태 변경 로그 (변경 시에만 저장)
CREATE TABLE service_status_logs (
  id BIGSERIAL PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  status TEXT CHECK (status IN ('OK', 'WARN', 'ERROR')),
  response_time INT,
  http_status INT,
  message TEXT
);

-- 인덱스: 성능 최적화
CREATE INDEX idx_logs_service_timestamp ON service_status_logs(service_id, timestamp DESC);
CREATE INDEX idx_logs_timestamp ON service_status_logs(timestamp DESC);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- services 테이블 RLS (공개 읽기 허용)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for services"
  ON services FOR SELECT
  TO anon, authenticated
  USING (true);

-- service_status_logs 테이블 RLS (공개 읽기 허용)
ALTER TABLE service_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for logs"
  ON service_status_logs FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- 초기 데이터
-- ============================================

-- 모니터링 대상 서비스 등록
INSERT INTO services (name, url, threshold_ms) VALUES
  ('Inspire Me', 'https://inspire-me.advenoh.pe.kr', 3000),
  ('ArgoCD', 'https://argocd.advenoh.pe.kr', 3000),
  ('Redis Insight', 'https://redisinsight.advenoh.pe.kr', 3000);
