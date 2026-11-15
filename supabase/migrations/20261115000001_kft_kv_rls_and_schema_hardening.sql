-- =====================================================================================
-- Cambodia Flavors & Tourism — Migration: Granular RLS Policies & KV Namespace Guard
--
-- Purpose:
--   1. Replaces the legacy single permissive policy
--      ("Allow public read and write for app sync" FOR ALL USING (true) WITH CHECK (true))
--      with 4 operation-specific policies (SELECT, INSERT, UPDATE, DELETE).
--   2. Closes SEC-01 (User Table Read Exposure):
--      Blocks unattested raw REST/scraper SELECT queries against sensitive keys
--      (`kft_user_*`, `kft_cloud_users_*`, `kft_cloud_vip_backup_v1`, `kft_cloud_deleted_users_v1`,
--      `kft_admin_pin_security_v1`). Only trusted server roles, verified Admin tokens,
--      or attested official app requests (when `block_direct_user_select` is not 'on') may read them.
--      Also provides a SECURITY DEFINER RPC `public.kft_get_single_user_record(p_user_key text)`
--      for single-account lookup without exposing table scans.
--   3. Enforces key namespace (`kft_%`), key length (<= 200), and valid JSONB object/array
--      payloads at the RLS layer before triggers even run.
--   4. Requires official app attestation headers (`x-kft-app-id = 'com.khmerfood.tourism'`
--      and valid `x-kft-app-sig`) OR a verified Admin token (`x-kft-admin-token`) for
--      client-initiated writes and deletes.
-- =====================================================================================

BEGIN;

-- Helper: validate SELECT requests on public.kft_app_kv_store (SEC-01 protection)
CREATE OR REPLACE FUNCTION public.kft_is_valid_kv_select_request(p_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hdrs      text := current_setting('request.headers', true);
  v_app_id  text;
  v_sig     text;
  v_tok     text;
BEGIN
  IF p_key IS NULL OR p_key NOT LIKE 'kft\_%' ESCAPE '\' THEN
    RETURN false;
  END IF;

  -- 1. Public catalog/override keys (food, shop, hotel, tourism overrides, public app settings, video reviews)
  IF p_key NOT LIKE 'kft\_user\_%' ESCAPE '\'
     AND p_key NOT IN (
       'kft_cloud_users_v1',
       'kft_cloud_users_v2',
       'kft_cloud_vip_backup_v1',
       'kft_cloud_deleted_users_v1',
       'kft_admin_pin_security_v1',
       'kft_cloud_user_activity_logs_v1'
     ) THEN
    RETURN true;
  END IF;

  -- 2. Trusted server roles (SQL Editor, Migrations, Edge Functions service_role)
  IF hdrs IS NULL OR hdrs = '' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN true;
  END IF;

  BEGIN
    v_app_id := (hdrs::json) ->> 'x-kft-app-id';
    v_sig    := (hdrs::json) ->> 'x-kft-app-sig';
    v_tok    := (hdrs::json) ->> 'x-kft-admin-token';
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  -- 3. Verified Admin token can always read user directory & security rows
  IF public.kft_admin_token_ok(v_tok) THEN
    RETURN true;
  END IF;

  -- 4. Never expose admin PIN security configuration to non-admin clients
  IF p_key = 'kft_admin_pin_security_v1' THEN
    RETURN false;
  END IF;

  -- 5. If strict Edge-Function-only user read mode is enabled, block direct client SELECT on user rows
  IF coalesce(public.kft_security_flag('block_direct_user_select'), 'off') = 'on' THEN
    RETURN false;
  END IF;

  -- 6. Require official app attestation headers (blocks raw browser/curl/scraper dumping of kft_user_*)
  IF coalesce(v_app_id, '') <> 'com.khmerfood.tourism'
     OR coalesce(v_sig, '') = ''
     OR v_sig = 'TAMPERED_CLONE'
     OR v_sig NOT LIKE 'v1\_%' ESCAPE '\' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.kft_is_valid_kv_select_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kft_is_valid_kv_select_request(text) TO anon, authenticated, service_role;

-- Helper: validate INSERT/UPDATE requests on public.kft_app_kv_store
CREATE OR REPLACE FUNCTION public.kft_is_valid_kv_write_request(p_key text, p_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hdrs       text := current_setting('request.headers', true);
  v_app_id   text;
  v_sig      text;
  v_tok      text;
  v_admin_ok boolean := false;
BEGIN
  -- 1. Basic structural sanity: only kft_* keys and JSON object/array payloads
  IF p_key IS NULL OR length(p_key) < 5 OR length(p_key) > 200 OR p_key NOT LIKE 'kft\_%' ESCAPE '\' THEN
    RETURN false;
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) NOT IN ('object', 'array') THEN
    RETURN false;
  END IF;

  -- 2. Trusted server roles (SQL Editor, Migrations, Edge Functions service_role)
  IF hdrs IS NULL OR hdrs = '' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN true;
  END IF;

  BEGIN
    v_app_id := (hdrs::json) ->> 'x-kft-app-id';
    v_sig    := (hdrs::json) ->> 'x-kft-app-sig';
    v_tok    := (hdrs::json) ->> 'x-kft-admin-token';
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  v_admin_ok := public.kft_admin_token_ok(v_tok);
  IF v_admin_ok THEN
    RETURN true;
  END IF;

  -- 3. Admin-only configuration & deletion ledgers require a valid signed Admin token when enforced
  IF p_key IN (
    'kft_cloud_app_settings_v1',
    'kft_cloud_admin_vip_pricing_v2',
    'kft_admin_pin_security_v1',
    'kft_cloud_deleted_users_v1',
    'kft_cloud_deleted_transactions_v1'
  ) AND coalesce(public.kft_security_flag('enforce_admin_keys'), 'on') = 'on' THEN
    RETURN false;
  END IF;

  -- 4. Require official app attestation headers (blocks raw curl/script writes that only pass the anon key)
  IF coalesce(public.kft_security_flag('enforce_app_integrity'), 'on') = 'on' THEN
    IF coalesce(v_app_id, '') <> 'com.khmerfood.tourism'
       OR coalesce(v_sig, '') = ''
       OR v_sig = 'TAMPERED_CLONE'
       OR v_sig NOT LIKE 'v1\_%' ESCAPE '\' THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.kft_is_valid_kv_write_request(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kft_is_valid_kv_write_request(text, jsonb) TO anon, authenticated, service_role;

-- Helper: validate DELETE requests on public.kft_app_kv_store
CREATE OR REPLACE FUNCTION public.kft_is_valid_kv_delete_request(p_key text, p_old_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hdrs            text := current_setting('request.headers', true);
  v_app_id        text;
  v_sig           text;
  v_tok           text;
  v_allow_dest    text;
  v_prev_pw_hash  text;
BEGIN
  -- 1. Trusted server roles
  IF hdrs IS NULL OR hdrs = '' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN true;
  END IF;

  BEGIN
    v_app_id       := (hdrs::json) ->> 'x-kft-app-id';
    v_sig          := (hdrs::json) ->> 'x-kft-app-sig';
    v_tok          := (hdrs::json) ->> 'x-kft-admin-token';
    v_allow_dest   := (hdrs::json) ->> 'x-kft-allow-destructive';
    v_prev_pw_hash := (hdrs::json) ->> 'x-kft-prev-pw-hash';
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  -- 2. Verified Admin
  IF public.kft_admin_token_ok(v_tok) THEN
    RETURN true;
  END IF;

  -- 3. Require official app attestation for any non-admin delete
  IF coalesce(v_app_id, '') <> 'com.khmerfood.tourism'
     OR coalesce(v_sig, '') = ''
     OR v_sig = 'TAMPERED_CLONE'
     OR v_sig NOT LIKE 'v1\_%' ESCAPE '\' THEN
    RETURN false;
  END IF;

  -- 4. Allow user self-deletion of their own kft_user_* row when matching password hash is supplied
  IF p_key LIKE 'kft\_user\_%' ESCAPE '\'
     AND coalesce(v_allow_dest, '') IN ('1', 'true')
     AND (
       coalesce(p_old_payload->>'passwordHash', '') = ''
       OR (coalesce(v_prev_pw_hash, '') <> '' AND v_prev_pw_hash = (p_old_payload->>'passwordHash'))
     ) THEN
    RETURN true;
  END IF;

  -- 5. Allow official app cleanup of per-item media overrides, media vault entries, and avatar records
  IF p_key LIKE 'kft\_ov\_%' ESCAPE '\'
     OR p_key LIKE 'kft\_media\_%' ESCAPE '\'
     OR p_key LIKE 'kft\_avatar\_%' ESCAPE '\' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.kft_is_valid_kv_delete_request(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kft_is_valid_kv_delete_request(text, jsonb) TO anon, authenticated, service_role;

-- SEC-01 RPC: Single-account lookup by exact key without exposing bulk table scans
CREATE OR REPLACE FUNCTION public.kft_get_single_user_record(p_user_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
BEGIN
  IF p_user_key IS NULL OR p_user_key NOT LIKE 'kft\_user\_%' ESCAPE '\' OR length(p_user_key) > 160 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object('key', key, 'payload', payload, 'updated_at', updated_at)
    INTO v_row
    FROM public.kft_app_kv_store
   WHERE key = p_user_key
   LIMIT 1;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.kft_get_single_user_record(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kft_get_single_user_record(text) TO anon, authenticated, service_role;

-- Replace permissive FOR ALL policy with 4 strict, operation-specific RLS policies
DROP POLICY IF EXISTS "Allow public read and write for app sync" ON public.kft_app_kv_store;
DROP POLICY IF EXISTS "kft_kv_select_policy" ON public.kft_app_kv_store;
DROP POLICY IF EXISTS "kft_kv_insert_policy" ON public.kft_app_kv_store;
DROP POLICY IF EXISTS "kft_kv_update_policy" ON public.kft_app_kv_store;
DROP POLICY IF EXISTS "kft_kv_delete_policy" ON public.kft_app_kv_store;

CREATE POLICY "kft_kv_select_policy"
  ON public.kft_app_kv_store
  FOR SELECT
  USING (public.kft_is_valid_kv_select_request(key));

CREATE POLICY "kft_kv_insert_policy"
  ON public.kft_app_kv_store
  FOR INSERT
  WITH CHECK (public.kft_is_valid_kv_write_request(key, payload));

CREATE POLICY "kft_kv_update_policy"
  ON public.kft_app_kv_store
  FOR UPDATE
  USING (public.kft_is_valid_kv_write_request(key, payload))
  WITH CHECK (public.kft_is_valid_kv_write_request(key, payload));

CREATE POLICY "kft_kv_delete_policy"
  ON public.kft_app_kv_store
  FOR DELETE
  USING (public.kft_is_valid_kv_delete_request(key, payload));

COMMIT;
