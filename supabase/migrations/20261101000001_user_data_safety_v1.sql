-- ============================================================================
-- Cambodia Flavors & Tourism â€” USER DATA SAFETY MIGRATION v1   (server-side, NON-DESTRUCTIVE)
-- ----------------------------------------------------------------------------
-- Run ONCE in: Supabase Dashboard -> SQL Editor -> New query.  Safe to re-run (idempotent).
-- This script NEVER drops, truncates, or rewrites existing user rows.
--
-- Root causes this closes (see docs/USER_DATA_SAFETY.md):
--   1. A device holding a small/incomplete list could overwrite the central user list
--      (kft_cloud_users_v1/v2) -> now rejected by the database itself (KFT_GUARD).
--   2. A stale device could downgrade an active VIP or move a registration date forward
--      -> now impossible: VIP entitlement and registration date are MONOTONIC per user row.
--   3. Any accidental/buggy DELETE of a user row was permanent
--      -> deletes of protected keys need an explicit admin header, and every
--         overwritten/deleted protected row is archived in kft_app_kv_history.
--   4. No server-side backup existed -> snapshots + a non-destructive restore function.
--
-- NOTE: The app talks to the database with the public (anon) key, so these guards stop BUGS and
-- stale clients (the real cause of the lost users) but are not a substitute for moving writes behind
-- an authenticated Edge Function (planned Phase 2).  Header used for intentional admin actions:
--      x-kft-allow-destructive: true
-- ============================================================================

-- 0. Helper: which keys are protected (accounts / VIP / registration history / payments)
CREATE OR REPLACE FUNCTION public.kft_is_protected_key(k text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT k LIKE 'kft\_user\_%' ESCAPE '\'
      OR k IN ('kft_cloud_users_v1', 'kft_cloud_users_v2', 'kft_cloud_vip_backup_v1',
               'kft_cloud_deleted_users_v1', 'kft_cloud_transactions_v1');
$$;

-- Safe timestamp parser (invalid text -> NULL instead of an error that would block a user write)
CREATE OR REPLACE FUNCTION public.kft_try_ts(v text)
RETURNS timestamptz LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF v IS NULL OR v = '' THEN RETURN NULL; END IF;
  RETURN v::timestamptz;
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

-- 1. History archive (append-only, not readable/writable by the anon key: RLS enabled with NO policy)
CREATE TABLE IF NOT EXISTS public.kft_app_kv_history (
  id             BIGSERIAL PRIMARY KEY,
  key            TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  row_updated_at TIMESTAMPTZ,
  archived_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  op             TEXT        NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kft_kv_history_key_time ON public.kft_app_kv_history (key, archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_kft_kv_history_time     ON public.kft_app_kv_history (archived_at DESC);
ALTER TABLE public.kft_app_kv_history ENABLE ROW LEVEL SECURITY;

-- 2. Snapshots (pre-deploy / scheduled full copies of every protected row)
CREATE TABLE IF NOT EXISTS public.kft_app_kv_snapshots (
  snapshot_id TEXT        NOT NULL,
  key         TEXT        NOT NULL,
  payload     JSONB       NOT NULL,
  taken_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_id, key)
);
CREATE INDEX IF NOT EXISTS idx_kft_kv_snapshots_taken ON public.kft_app_kv_snapshots (taken_at DESC);
ALTER TABLE public.kft_app_kv_snapshots ENABLE ROW LEVEL SECURITY;

-- 3. Indexes for 10,000+ users (prefix scans, newest-first paging, search). Idempotent with supabase_admin_users_scale_10k.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_kft_kv_key_prefix        ON public.kft_app_kv_store (key text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_kft_kv_user_updated_at   ON public.kft_app_kv_store (updated_at DESC) WHERE key LIKE 'kft_user_%';
CREATE INDEX IF NOT EXISTS idx_kft_kv_user_email        ON public.kft_app_kv_store (LOWER(payload->>'email')) WHERE key LIKE 'kft_user_%';
CREATE INDEX IF NOT EXISTS idx_kft_kv_user_phone        ON public.kft_app_kv_store ((payload->>'phone')) WHERE key LIKE 'kft_user_%';
CREATE INDEX IF NOT EXISTS idx_kft_kv_user_role         ON public.kft_app_kv_store ((payload->>'role')) WHERE key LIKE 'kft_user_%';
CREATE INDEX IF NOT EXISTS idx_kft_kv_user_vip_status   ON public.kft_app_kv_store ((payload->>'membershipTier'), (payload->>'subscriptionStatus')) WHERE key LIKE 'kft_user_%';

-- 4. GUARD trigger (fires first: name starts with "a_")
CREATE OR REPLACE FUNCTION public.kft_kv_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  hdrs        text    := current_setting('request.headers', true);
  via_api     boolean := (hdrs IS NOT NULL AND hdrs <> '');
  allow_flag  boolean := false;
  old_len     int;
  new_len     int;
  old_exp     timestamptz;
  new_exp     timestamptz;
  old_active  boolean;
  new_cancel  boolean;
BEGIN
  IF NOT public.kft_is_protected_key(OLD.key) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF via_api THEN
    BEGIN
      allow_flag := coalesce((hdrs::json) ->> 'x-kft-allow-destructive', '') = 'true';
    EXCEPTION WHEN others THEN
      allow_flag := false;
    END;
  END IF;

  -- SQL editor / service role (no PostgREST request) or explicit admin confirmation => allowed (still archived below)
  IF (NOT via_api) OR allow_flag THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'KFT_GUARD: delete of protected key % blocked (intentional admin deletes must send x-kft-allow-destructive)', OLD.key
      USING ERRCODE = 'P0001';
  END IF;

  -- 4a. Whole-list user aggregates may never shrink by more than 20% in a single write
  IF OLD.key IN ('kft_cloud_users_v1', 'kft_cloud_users_v2') THEN
    IF jsonb_typeof(OLD.payload) = 'array' THEN
      IF jsonb_typeof(NEW.payload) <> 'array' THEN
        RAISE EXCEPTION 'KFT_GUARD: % must stay a JSON array', OLD.key USING ERRCODE = 'P0001';
      END IF;
      old_len := jsonb_array_length(OLD.payload);
      new_len := jsonb_array_length(NEW.payload);
      IF old_len >= 5 AND new_len < ceil(old_len * 0.8) THEN
        RAISE EXCEPTION 'KFT_GUARD: refusing to shrink % from % to % users (possible incomplete device list)', OLD.key, old_len, new_len
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- 4b. Per-user rows: VIP entitlement + registration date are monotonic
  IF OLD.key LIKE 'kft\_user\_%' ESCAPE '\' AND jsonb_typeof(OLD.payload) = 'object' AND jsonb_typeof(NEW.payload) = 'object' THEN
    old_exp := public.kft_try_ts(coalesce(OLD.payload->>'subscriptionExpiryDate', OLD.payload->>'vipExpiresAt'));
    old_active := coalesce(OLD.payload->>'membershipTier', '') = 'premium_vip'
              AND coalesce(OLD.payload->>'subscriptionStatus', '') <> 'cancelled'
              AND (OLD.payload->>'vipCancelledAt') IS NULL
              AND old_exp IS NOT NULL AND old_exp > now();
    new_cancel := coalesce(NEW.payload->>'subscriptionStatus', '') = 'cancelled'
               OR (NEW.payload->>'vipCancelledAt') IS NOT NULL;
    IF old_active AND NOT new_cancel THEN
      new_exp := public.kft_try_ts(coalesce(NEW.payload->>'subscriptionExpiryDate', NEW.payload->>'vipExpiresAt'));
      IF coalesce(NEW.payload->>'membershipTier', '') <> 'premium_vip' OR new_exp IS NULL OR new_exp < old_exp THEN
        -- A stale / freshly-reset client tried to erase or shorten an active VIP: keep the server's entitlement.
        NEW.payload := NEW.payload || jsonb_strip_nulls(jsonb_build_object(
          'membershipTier',         OLD.payload->'membershipTier',
          'subscriptionStatus',     OLD.payload->'subscriptionStatus',
          'vipStatus',              OLD.payload->'vipStatus',
          'paymentStatus',          OLD.payload->'paymentStatus',
          'subscriptionStartDate',  OLD.payload->'subscriptionStartDate',
          'subscriptionExpiryDate', OLD.payload->'subscriptionExpiryDate',
          'vipExpiresAt',           OLD.payload->'vipExpiresAt',
          'vipPlanDays',            OLD.payload->'vipPlanDays',
          'vipPlanType',            OLD.payload->'vipPlanType',
          'transactionRef',         OLD.payload->'transactionRef',
          'paidAdditionalStoreSlots', OLD.payload->'paidAdditionalStoreSlots'
        ));
      END IF;
    END IF;

    -- registration date can only move EARLIER (placeholder dates may be corrected, real dates are never erased)
    IF coalesce(OLD.payload->>'createdAt', '') <> ''
       AND (coalesce(NEW.payload->>'createdAt', '') = '' OR (OLD.payload->>'createdAt') < (NEW.payload->>'createdAt')) THEN
      NEW.payload := jsonb_set(NEW.payload, '{createdAt}', OLD.payload->'createdAt');
    END IF;
    IF coalesce(OLD.payload->>'registeredAtIso', '') <> ''
       AND (coalesce(NEW.payload->>'registeredAtIso', '') = '' OR (OLD.payload->>'registeredAtIso') < (NEW.payload->>'registeredAtIso')) THEN
      NEW.payload := jsonb_set(NEW.payload, '{registeredAtIso}', OLD.payload->'registeredAtIso');
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS a_kft_kv_guard ON public.kft_app_kv_store;
CREATE TRIGGER a_kft_kv_guard
  BEFORE UPDATE OR DELETE ON public.kft_app_kv_store
  FOR EACH ROW EXECUTE FUNCTION public.kft_kv_guard();

-- 5. ARCHIVE trigger: every overwritten/deleted protected row is kept (throttled to 1 copy / key / 10 min)
CREATE OR REPLACE FUNCTION public.kft_kv_archive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.kft_is_protected_key(OLD.key) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE'
     OR (OLD.payload IS DISTINCT FROM NEW.payload
         AND NOT EXISTS (SELECT 1 FROM public.kft_app_kv_history h
                          WHERE h.key = OLD.key AND h.archived_at > now() - interval '10 minutes')) THEN
    INSERT INTO public.kft_app_kv_history (key, payload, row_updated_at, op)
    VALUES (OLD.key, OLD.payload, OLD.updated_at, TG_OP);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS b_kft_kv_archive ON public.kft_app_kv_store;
CREATE TRIGGER b_kft_kv_archive
  BEFORE UPDATE OR DELETE ON public.kft_app_kv_store
  FOR EACH ROW EXECUTE FUNCTION public.kft_kv_archive();

-- 6. Snapshot / prune / restore (run from the SQL editor; NOT granted to the anon key)
CREATE OR REPLACE FUNCTION public.kft_create_snapshot(p_label text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid text := to_char(now() AT TIME ZONE 'utc', 'YYYYMMDD"T"HH24MISS') || coalesce('_' || regexp_replace(p_label, '[^a-zA-Z0-9_-]', '', 'g'), '');
BEGIN
  INSERT INTO public.kft_app_kv_snapshots (snapshot_id, key, payload)
  SELECT sid, s.key, s.payload FROM public.kft_app_kv_store s WHERE public.kft_is_protected_key(s.key);
  RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.kft_create_snapshot(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.kft_history_prune(p_retain_days int DEFAULT 60)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  DELETE FROM public.kft_app_kv_history WHERE archived_at < now() - make_interval(days => p_retain_days);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.kft_history_prune(int) FROM PUBLIC, anon, authenticated;

-- Non-destructive restore: only RE-CREATES per-user rows that are MISSING; never overwrites a live row.
-- Usage:  SELECT * FROM public.kft_restore_missing_users_from_snapshot('20261107T040000_pre-deploy', true);   -- dry run
--         SELECT * FROM public.kft_restore_missing_users_from_snapshot('20261107T040000_pre-deploy', false);  -- apply
CREATE OR REPLACE FUNCTION public.kft_restore_missing_users_from_snapshot(p_snapshot text, p_dry_run boolean DEFAULT true)
RETURNS TABLE (restored_key text, action text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH missing AS (
    SELECT sn.key, sn.payload FROM public.kft_app_kv_snapshots sn
    WHERE sn.snapshot_id = p_snapshot
      AND sn.key LIKE 'kft\_user\_%' ESCAPE '\'
      AND NOT EXISTS (SELECT 1 FROM public.kft_app_kv_store s WHERE s.key = sn.key)
  ), ins AS (
    INSERT INTO public.kft_app_kv_store (key, payload, updated_at)
    SELECT m.key, m.payload, now() FROM missing m WHERE NOT p_dry_run
    ON CONFLICT (key) DO NOTHING
    RETURNING public.kft_app_kv_store.key
  )
  SELECT m.key AS restored_key, CASE WHEN p_dry_run THEN 'would_restore' ELSE 'restored' END AS action FROM missing m;
END $$;
REVOKE ALL ON FUNCTION public.kft_restore_missing_users_from_snapshot(text, boolean) FROM PUBLIC, anon, authenticated;

-- 7. Read-only integrity report for dashboards / the pre-deploy script (counts only, no personal data)
CREATE OR REPLACE FUNCTION public.kft_users_integrity_report()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'checked_at', now(),
    'atomic_users',      (SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft\_user\_%' ESCAPE '\' AND coalesce(payload->>'role','') <> 'admin'),
    'active_vip',        (SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft\_user\_%' ESCAPE '\' AND payload->>'membershipTier' = 'premium_vip' AND payload->>'subscriptionStatus' = 'active'),
    'aggregate_v2_len',  (SELECT CASE WHEN jsonb_typeof(payload) = 'array' THEN jsonb_array_length(payload) END FROM public.kft_app_kv_store WHERE key = 'kft_cloud_users_v2'),
    'missing_created_at',(SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft\_user\_%' ESCAPE '\' AND coalesce(payload->>'createdAt', payload->>'registeredAtIso', '') = ''),
    'duplicate_emails',  (SELECT count(*) FROM (SELECT lower(payload->>'email') e FROM public.kft_app_kv_store WHERE key LIKE 'kft\_user\_%' ESCAPE '\' AND coalesce(payload->>'email','') <> '' GROUP BY 1 HAVING count(*) > 1) d),
    'history_rows',      (SELECT count(*) FROM public.kft_app_kv_history),
    'last_snapshot_at',  (SELECT max(taken_at) FROM public.kft_app_kv_snapshots)
  );
$$;
GRANT EXECUTE ON FUNCTION public.kft_users_integrity_report() TO anon, authenticated;

-- 8. OPTIONAL automatic nightly snapshot + weekly prune (enable the pg_cron extension in Dashboard -> Database -> Extensions first)
-- SELECT cron.schedule('kft-nightly-snapshot', '0 20 * * *', $$SELECT public.kft_create_snapshot('nightly')$$);   -- 03:00 Cambodia time
-- SELECT cron.schedule('kft-history-prune',    '0 21 * * 0', $$SELECT public.kft_history_prune(60)$$);

-- 9. Take the first snapshot right now (baseline before any deploy)
SELECT public.kft_create_snapshot('baseline-after-safety-migration') AS snapshot_id;
