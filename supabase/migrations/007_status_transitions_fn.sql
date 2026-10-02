-- 007_status_transitions_fn.sql
-- 상태 전환 행만 반환하는 함수
-- service_status_logs 는 체크마다 1행씩 쌓여(15분 간격 × 15개 서비스 ≈ 1,440행/일)
-- PostgREST Max Rows(1000)를 넘는다. 대시보드 incident 계산에는 상태가 바뀐 행만 필요하다.

-- 직전 로그와 status 가 다른 행(상태 전환)만 반환한다.
-- 서비스별 첫 행(since 이후)은 직전 행이 없으므로 항상 포함된다.
CREATE OR REPLACE FUNCTION get_status_transitions(since TIMESTAMPTZ)
RETURNS TABLE (
  id BIGINT,
  service_id UUID,
  service_name TEXT,
  status TEXT,
  "timestamp" TIMESTAMPTZ,
  response_time INT,
  message TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT t.id, t.service_id, s.name, t.status, t."timestamp", t.response_time, t.message
  FROM (
    SELECT l.*,
           LAG(l.status) OVER (PARTITION BY l.service_id ORDER BY l."timestamp", l.id) AS prev_status
    FROM service_status_logs l
    WHERE l."timestamp" >= since
  ) t
  JOIN services s ON s.id = t.service_id
  WHERE t.prev_status IS DISTINCT FROM t.status
  ORDER BY t.service_id, t."timestamp", t.id;
$$;

-- SECURITY INVOKER: 기존 "Public read access for logs/services" RLS 정책이 그대로 적용된다.
GRANT EXECUTE ON FUNCTION get_status_transitions(TIMESTAMPTZ) TO anon, authenticated;
