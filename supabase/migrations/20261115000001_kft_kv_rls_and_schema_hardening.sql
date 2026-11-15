-- =====================================================================================
-- Cambodia Flavors & Tourism — Supabase KV Store Granular RLS & Attestation Hardening (v3)
-- Safe to re-run (idempotent). Preserves 100% of existing user, VIP, shop, food & travel data.
--
-- Why this migration exists (closes full_system_audit.md Finding #1):
--   Previously, public.kft_app_kv_store had a permissive "FOR ALL USING (true) WITH CHECK (true)"
--   RLS policy, and e_kft_clone_guard only rejected requests when x-kft-app-id was non-empty
--   and unequal to 'com.khmerfood.tourism'. As a result, an external script using the public
--   publishable key without app attestation headers could insert arbitrary keys or overwrite
--   unprotected keys.
--
-- What this migration enforces:
--   1. Drops the legacy "Allow public read and write for app sync" FOR ALL policy on
--      public.kft_app_kv_store.
--   2. Replaces it with 4 granular RLS policies (SELECT, INSERT, UPDATE, DELETE):
--      - SELECT: Only keys in the official 'kft_%' namespace may be read.
--      - INSERT / UPDATE:
--        a) Key must start with 'kft_' (<= 200 chars) and payload must be a JSON object or array
--           (blocks arbitrary test/probe keys and malformed payloads).
--        b) Caller must be service_role / postgres OR provide a valid signed Admin token
--           (x-kft-admin-token) OR provide the official Cambodia Flavors & Tourism attestation
--           headers (x-kft-app-id = 'com.khmerfood.tourism' and x-kft-app-sig LIKE 'v1_%').
--        c) Admin-only keys ('kft_cloud_app_settings_v1', 'kft_cloud_admin_vip_pricing_v2',
--           'kft_admin_pin_security_v1', 'kft_cloud_deleted_users_v1',
--           'kft_cloud_deleted_transactions_v1') require a valid signed Admin token when
--           enforce_admin_keys = 'on'.
--      - DELETE:
--        Blocked for anonymous callers unless they hold a valid signed Admin token, or are
--        performing a verified self-account deletion (with matching x-kft-prev-pw-hash), or
--        cleaning up a 'kft_ov_%' media override with valid app attestation.
-- =====================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.kft_app_kv_store (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kft_app_kv_store ENABLE ROW LEVEL SECURITY;

-- Helper: validate INSERT / UPDATE requests on public.kft_app_kv_store
CREATE OR REPLACE FUNCTION public.kft_is_valid_kv_write_request(p_key text, p_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hdrs        text := current_setting('request.headers', true);
  v_app_id    text;
  v_sig       text;
  v_tok       text;
  v_admin_ok  boolean := false;
BEGIN
  -- 1. Key namespace & payload shape check (blocks arbitrary non-kft keys)
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

  -- 2. Verified Admin with explicit destructive header
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

  -- 5. Allow official app cleanup of per-item media override tombstones (kft_ov_*)
  IF p_key LIKE 'kft\_ov\_%' ESCAPE '\' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.kft_is_valid_kv_delete_request(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kft_is_valid_kv_delete_request(text, jsonb) TO anon, authenticated, service_role;

-- Replace permissive FOR ALL policy with 4 strict, operation-specific RLS policies
DROP POLICY IF EXISTS "Allow public read and write for app sync" ON public.kft_app_kv_store;
DROP POLICY IF EXISTS "kft_kv_select_policy" ON public.kft_app_kv_store;
DROP POLICY IF EXISTS "kft_kv_insert_policy" ON public.kft_app_kv_store;
DROP POLICY IF EXISTS "kft_kv_update_policy" ON public.kft_app_kv_store;
DROP POLICY IF EXISTS "kft_kv_delete_policy" ON public.kft_app_kv_store;

CREATE POLICY "kft_kv_select_policy"
  ON public.kft_app_kv_store
  FOR SELECT
  USING (key LIKE 'kft\_%' ESCAPE '\');

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
