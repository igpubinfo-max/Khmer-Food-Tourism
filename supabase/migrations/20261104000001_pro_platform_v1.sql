-- =====================================================================================
-- Cambodia Flavors & Tourism - Supabase Pro platform migration v1  (Phase A)
-- Safe to re-run. NON-DESTRUCTIVE: touches no user / VIP / shop / food / hotel / travel data.
--
-- What it adds
--   1. kft_api_usage_daily / kft_api_usage_log : per-user + per-IP daily quotas and cost log
--      for the Edge Functions (food-ai, places-proxy). Service-role only (no anon access).
--   2. kft_places_cache : server-side cache of Google Places text/nearby/details responses
--      (cuts Google Maps billing; TTL <= 7 days, well under Google's 30-day caching limit).
--   3. kft_api_usage_hit(...)   : atomic "count + check limit" used by the Edge Functions.
--   4. kft_api_usage_report(d)  : daily cost / usage report for the Admin (SQL editor / service role).
--   5. pg_cron schedules (Pro): nightly snapshot of protected rows, snapshot + history pruning,
--      cache + usage-log cleanup, weekly table maintenance.
--   6. kft_platform_health()    : one-call health report (sizes, last snapshot, cron jobs, counts).
--
-- Run:  Supabase Dashboard -> SQL Editor -> paste -> Run.   (Run supabase_user_data_safety_v1.sql first.)
-- =====================================================================================

-- ------------------------------------------------------------------ 1. usage tables
CREATE TABLE IF NOT EXISTS public.kft_api_usage_daily (
  day       date        NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Phnom_Penh')::date,
  user_key  text        NOT NULL,                    -- user id, or 'ip:<address>' for anonymous callers
  kind      text        NOT NULL,                    -- 'ai' | 'places'
  hits      integer     NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, user_key, kind)
);

CREATE TABLE IF NOT EXISTS public.kft_api_usage_log (
  id         bigserial   PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  user_key   text,
  kind       text        NOT NULL,                   -- 'ai' | 'places'
  provider   text,                                    -- gemini | openai | google_places
  model      text,
  status     integer,
  tokens_in  integer,
  tokens_out integer,
  cache_hit  boolean     NOT NULL DEFAULT false,
  ms         integer,
  note       text
);
CREATE INDEX IF NOT EXISTS idx_kft_api_usage_log_at ON public.kft_api_usage_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_kft_api_usage_log_kind_at ON public.kft_api_usage_log (kind, at DESC);

CREATE TABLE IF NOT EXISTS public.kft_places_cache (
  cache_key  text        PRIMARY KEY,                -- sha-256 of the sanitised request
  payload    jsonb       NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kft_places_cache_expires ON public.kft_places_cache (expires_at);

-- Service-role only: RLS ON and NO policies => the public anon / authenticated keys can read nothing here.
ALTER TABLE public.kft_api_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kft_api_usage_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kft_places_cache    ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kft_api_usage_daily, public.kft_api_usage_log, public.kft_places_cache FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.kft_api_usage_log_id_seq FROM anon, authenticated;

-- ------------------------------------------------------------------ 3. atomic quota counter
-- Returns the NEW hit count for today. The Edge Function compares it with its limit.
CREATE OR REPLACE FUNCTION public.kft_api_usage_hit(p_user text, p_kind text, p_weight integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_hits integer;
BEGIN
  INSERT INTO public.kft_api_usage_daily AS d (day, user_key, kind, hits)
  VALUES ((now() AT TIME ZONE 'Asia/Phnom_Penh')::date, left(p_user, 160), left(p_kind, 40), GREATEST(p_weight, 1))
  ON CONFLICT (day, user_key, kind)
  DO UPDATE SET hits = d.hits + GREATEST(p_weight, 1), updated_at = now()
  RETURNING hits INTO v_hits;
  RETURN v_hits;
END;
$$;
REVOKE ALL ON FUNCTION public.kft_api_usage_hit(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kft_api_usage_hit(text, text, integer) TO service_role;

-- ------------------------------------------------------------------ 4. report for the Admin
CREATE OR REPLACE FUNCTION public.kft_api_usage_report(p_days integer DEFAULT 7)
RETURNS TABLE (day date, kind text, provider text, calls bigint, cache_hits bigint, errors bigint, tokens_in bigint, tokens_out bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (at AT TIME ZONE 'Asia/Phnom_Penh')::date AS day, kind, COALESCE(provider, '-') AS provider,
         count(*) AS calls,
         count(*) FILTER (WHERE cache_hit) AS cache_hits,
         count(*) FILTER (WHERE status >= 400) AS errors,
         COALESCE(sum(tokens_in), 0)::bigint, COALESCE(sum(tokens_out), 0)::bigint
  FROM public.kft_api_usage_log
  WHERE at >= now() - make_interval(days => GREATEST(p_days, 1))
  GROUP BY 1, 2, 3
  ORDER BY 1 DESC, 2, 3;
$$;
REVOKE ALL ON FUNCTION public.kft_api_usage_report(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kft_api_usage_report(integer) TO service_role;

-- ------------------------------------------------------------------ maintenance functions
CREATE OR REPLACE FUNCTION public.kft_platform_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c1 bigint; c2 bigint; c3 bigint;
BEGIN
  DELETE FROM public.kft_places_cache WHERE expires_at < now();            GET DIAGNOSTICS c1 = ROW_COUNT;
  DELETE FROM public.kft_api_usage_log WHERE at < now() - interval '90 days'; GET DIAGNOSTICS c2 = ROW_COUNT;
  DELETE FROM public.kft_api_usage_daily WHERE day < (now() AT TIME ZONE 'Asia/Phnom_Penh')::date - 60; GET DIAGNOSTICS c3 = ROW_COUNT;
  RETURN jsonb_build_object('places_cache_deleted', c1, 'usage_log_deleted', c2, 'usage_daily_deleted', c3);
END;
$$;
REVOKE ALL ON FUNCTION public.kft_platform_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kft_platform_cleanup() TO service_role;

-- Keep the newest N snapshots (default 21 = 3 weeks of nightly copies). Never touches live data.
CREATE OR REPLACE FUNCTION public.kft_snapshot_prune(p_keep integer DEFAULT 21)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c bigint;
BEGIN
  DELETE FROM public.kft_app_kv_snapshots s
  WHERE s.snapshot_id NOT IN (
    SELECT snapshot_id FROM (
      SELECT snapshot_id, max(taken_at) AS t FROM public.kft_app_kv_snapshots GROUP BY snapshot_id ORDER BY t DESC LIMIT GREATEST(p_keep, 3)
    ) keep
  );
  GET DIAGNOSTICS c = ROW_COUNT;
  RETURN c;
END;
$$;
REVOKE ALL ON FUNCTION public.kft_snapshot_prune(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kft_snapshot_prune(integer) TO service_role;

-- ------------------------------------------------------------------ 6. health report
CREATE OR REPLACE FUNCTION public.kft_platform_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'database_size',         pg_size_pretty(pg_database_size(current_database())),
    'kv_store_table_size',   pg_size_pretty(pg_total_relation_size('public.kft_app_kv_store')),
    'kv_rows',               (SELECT count(*) FROM public.kft_app_kv_store),
    'user_rows',             (SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft_user_%'),
    'vip_active_rows',       (SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft_user_%' AND payload->>'membershipTier' = 'premium_vip' AND payload->>'subscriptionStatus' = 'active'),
    'history_rows',          (SELECT count(*) FROM public.kft_app_kv_history),
    'snapshot_count',        (SELECT count(DISTINCT snapshot_id) FROM public.kft_app_kv_snapshots),
    'last_snapshot_at',      (SELECT max(taken_at) FROM public.kft_app_kv_snapshots),
    'places_cache_rows',     (SELECT count(*) FROM public.kft_places_cache WHERE expires_at > now()),
    'ai_calls_today',        (SELECT COALESCE(sum(hits), 0) FROM public.kft_api_usage_daily WHERE kind = 'ai' AND day = (now() AT TIME ZONE 'Asia/Phnom_Penh')::date),
    'places_calls_today',    (SELECT COALESCE(sum(hits), 0) FROM public.kft_api_usage_daily WHERE kind = 'places' AND day = (now() AT TIME ZONE 'Asia/Phnom_Penh')::date),
    'cron_jobs',             COALESCE((SELECT jsonb_agg(jobname ORDER BY jobname) FROM cron.job WHERE jobname LIKE 'kft-%'), '[]'::jsonb)
  ) INTO r;
  RETURN r;
EXCEPTION WHEN undefined_table OR invalid_schema_name THEN
  -- pg_cron not enabled yet: report everything except the cron list
  SELECT jsonb_build_object(
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'kv_rows', (SELECT count(*) FROM public.kft_app_kv_store),
    'user_rows', (SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft_user_%'),
    'last_snapshot_at', (SELECT max(taken_at) FROM public.kft_app_kv_snapshots),
    'cron_jobs', 'pg_cron not enabled'
  ) INTO r;
  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.kft_platform_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kft_platform_health() TO service_role;

-- ------------------------------------------------------------------ 5. pg_cron schedules (Supabase Pro)
-- (Asia/Phnom_Penh = UTC+7, so 20:00 UTC = 03:00 local.)
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create pg_cron automatically (%). Enable it in Dashboard -> Database -> Extensions, then re-run this file.', SQLERRM;
  END;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobname) FROM cron.job
      WHERE jobname IN ('kft-nightly-snapshot', 'kft-snapshot-prune', 'kft-history-prune', 'kft-platform-cleanup', 'kft-weekly-vacuum');

    PERFORM cron.schedule('kft-nightly-snapshot', '0 20 * * *',  $c$SELECT public.kft_create_snapshot('nightly')$c$);
    PERFORM cron.schedule('kft-snapshot-prune',   '30 20 * * *', $c$SELECT public.kft_snapshot_prune(21)$c$);
    PERFORM cron.schedule('kft-history-prune',    '0 21 * * 0',  $c$SELECT public.kft_history_prune(60)$c$);
    PERFORM cron.schedule('kft-platform-cleanup', '15 21 * * *', $c$SELECT public.kft_platform_cleanup()$c$);
    PERFORM cron.schedule('kft-weekly-vacuum',    '30 21 * * 0', $c$VACUUM (ANALYZE) public.kft_app_kv_store$c$);
    RAISE NOTICE 'pg_cron jobs scheduled: nightly snapshot, snapshot prune, history prune, cleanup, weekly vacuum.';
  END IF;
END
$$;

-- ------------------------------------------------------------------ verification (read-only)
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('kft_api_usage_daily','kft_api_usage_log','kft_places_cache')) AS new_tables_expected_3,
  (SELECT count(*) FROM pg_proc WHERE proname IN ('kft_api_usage_hit','kft_api_usage_report','kft_platform_cleanup','kft_snapshot_prune','kft_platform_health')) AS new_functions_expected_5,
  (SELECT count(*) FROM pg_class WHERE relname IN ('kft_api_usage_daily','kft_api_usage_log','kft_places_cache') AND relrowsecurity) AS rls_on_expected_3,
  (SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft_user_%') AS user_rows_untouched,
  public.kft_platform_health() AS health;
