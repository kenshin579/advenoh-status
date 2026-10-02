-- 008_drop_public_summary_write_policy.sql
-- daily_status_summary 의 공개 쓰기 허용 정책 제거
--
-- 006 의 "Service role can manage daily_status_summary" 는 TO 절이 없어 PUBLIC(anon 포함)에 적용되고,
-- FOR ALL USING (true) 라서 공개 anon key 로 INSERT/UPDATE/DELETE 가 가능했다
-- (2026-10-02 실측: anon INSERT 가 RLS 를 통과해 FK 제약에서만 막힘, 23503).
-- service_role 은 RLS 를 우회하므로 health_check.py 의 쓰기에는 이 정책이 필요 없다.
-- 읽기는 "Anyone can read daily_status_summary" 정책으로 계속 허용된다.

DROP POLICY IF EXISTS "Service role can manage daily_status_summary" ON public.daily_status_summary;

--rollback CREATE POLICY "Service role can manage daily_status_summary" ON public.daily_status_summary FOR ALL TO service_role USING (true);
