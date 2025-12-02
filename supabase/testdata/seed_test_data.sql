-- ============================================
-- 테스트용 더미 데이터 생성
-- Supabase SQL Editor에서 직접 실행하세요
-- ============================================

-- 기존 로그 데이터 삭제
TRUNCATE service_status_logs;

-- 90일간의 테스트 데이터 생성
DO $$
DECLARE
    inspire_id UUID;
    argocd_id UUID;
    redis_id UUID;
    i INT;
    random_val FLOAT;
    random_status TEXT;
    random_response INT;
    log_timestamp TIMESTAMPTZ;
BEGIN
    -- 서비스 ID 가져오기
    SELECT id INTO inspire_id FROM services WHERE name = 'Inspire Me';
    SELECT id INTO argocd_id FROM services WHERE name = 'ArgoCD';
    SELECT id INTO redis_id FROM services WHERE name = 'Redis Insight';

    -- 최근 90일간의 테스트 데이터 생성
    FOR i IN 0..89 LOOP
        log_timestamp := NOW() - (i || ' days')::INTERVAL;

        -- Inspire Me: 90% OK, 7% WARN, 3% ERROR
        random_val := random();
        IF random_val < 0.90 THEN
            random_status := 'OK';
            random_response := 100 + floor(random() * 500)::INT;
        ELSIF random_val < 0.97 THEN
            random_status := 'WARN';
            random_response := 3100 + floor(random() * 1000)::INT;
        ELSE
            random_status := 'ERROR';
            random_response := 0;
        END IF;

        INSERT INTO service_status_logs (service_id, timestamp, status, response_time, http_status, message)
        VALUES (inspire_id, log_timestamp, random_status, random_response,
                CASE WHEN random_status = 'ERROR' THEN 500 ELSE 200 END,
                CASE WHEN random_status = 'ERROR' THEN 'Connection timeout' ELSE NULL END);

        -- ArgoCD: 95% OK, 3% WARN, 2% ERROR
        random_val := random();
        IF random_val < 0.95 THEN
            random_status := 'OK';
            random_response := 150 + floor(random() * 400)::INT;
        ELSIF random_val < 0.98 THEN
            random_status := 'WARN';
            random_response := 3200 + floor(random() * 800)::INT;
        ELSE
            random_status := 'ERROR';
            random_response := 0;
        END IF;

        INSERT INTO service_status_logs (service_id, timestamp, status, response_time, http_status, message)
        VALUES (argocd_id, log_timestamp, random_status, random_response,
                CASE WHEN random_status = 'ERROR' THEN 503 ELSE 200 END,
                CASE WHEN random_status = 'ERROR' THEN 'Service unavailable' ELSE NULL END);

        -- Redis Insight: 85% OK, 10% WARN, 5% ERROR
        random_val := random();
        IF random_val < 0.85 THEN
            random_status := 'OK';
            random_response := 80 + floor(random() * 300)::INT;
        ELSIF random_val < 0.95 THEN
            random_status := 'WARN';
            random_response := 3500 + floor(random() * 1500)::INT;
        ELSE
            random_status := 'ERROR';
            random_response := 0;
        END IF;

        INSERT INTO service_status_logs (service_id, timestamp, status, response_time, http_status, message)
        VALUES (redis_id, log_timestamp, random_status, random_response,
                CASE WHEN random_status = 'ERROR' THEN 502 ELSE 200 END,
                CASE WHEN random_status = 'ERROR' THEN 'Bad gateway' ELSE NULL END);
    END LOOP;
END $$;

-- 결과 확인
SELECT
    s.name as service_name,
    COUNT(*) as total_logs,
    SUM(CASE WHEN ssl.status = 'OK' THEN 1 ELSE 0 END) as ok_count,
    SUM(CASE WHEN ssl.status = 'WARN' THEN 1 ELSE 0 END) as warn_count,
    SUM(CASE WHEN ssl.status = 'ERROR' THEN 1 ELSE 0 END) as error_count
FROM service_status_logs ssl
JOIN services s ON ssl.service_id = s.id
GROUP BY s.name
ORDER BY s.name;
