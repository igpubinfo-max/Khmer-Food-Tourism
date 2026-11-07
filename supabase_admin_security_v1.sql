-- =====================================================================================
-- Cambodia Flavors & Tourism - Admin security migration v1  (Phase B1)
-- Safe to re-run. Touches NO user / VIP / shop / food / hotel / travel data and changes NO existing value.
--
-- Problem it solves
--   The documents `kft_cloud_app_settings_v1`, `kft_cloud_admin_vip_pricing_v2` and `kft_admin_pin_security_v1` hold the
--   payment QR image / account name / bank, VIP prices, APK + store download links and the admin PIN. With the public
--   anon key (shipped in every APK) ANYONE could overwrite them - e.g. swap the payment QR to their own account or
--   point the "download APK" link at malware.
--
-- What it adds
--   1. kft_security_config      : PRIVATE table (service role only): HMAC signing secret (random, generated HERE,
--                                  never shown) + the switch `enforce_admin_keys` (starts 'off' = nothing changes).
--   2. kft_admin_token_ok(text) : verifies the signed admin token issued by the `admin-auth` Edge Function.
--   3. kft_admin_keys_guard     : trigger. When enforce_admin_keys = 'on', INSERT/UPDATE/DELETE of those 3 keys through the
--                                  public API requires a valid x-kft-admin-token header. SQL editor / service role unaffected.
--   4. kft_admin_selftest()     : proves the SQL token check agrees with the signature algorithm (run below).
--
-- Order of operations (see docs/ADMIN_SECURITY.md):  run this file -> set ADMIN_PIN/ADMIN_PASSWORD secrets -> deploy
-- admin-auth -> install the new app build and log in once -> THEN switch enforcement on:
--      UPDATE public.kft_security_config SET value = 'on' WHERE name = 'enforce_admin_keys';
-- Emergency undo at any time:
--      UPDATE public.kft_security_config SET value = 'off' WHERE name = 'enforce_admin_keys';
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------------ 1. private config
CREATE TABLE IF NOT EXISTS public.kft_security_config (
  name       text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kft_security_config ENABLE ROW LEVEL SECURITY;      -- no policies => anon/authenticated read nothing
REVOKE ALL ON public.kft_security_config FROM anon, authenticated;

INSERT INTO public.kft_security_config (name, value)
VALUES ('admin_token_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;                                          -- never rotates an existing secret by accident

INSERT INTO public.kft_security_config (name, value)
VALUES ('enforce_admin_keys', 'off')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------ 2. token check (mirror of _shared/admin-token.ts)
CREATE OR REPLACE FUNCTION public.kft_admin_token_ok(p_token text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret  text;
  v_parts   text[];
  v_b64     text;
  v_expect  text;
  v_padded  text;
  v_payload jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 20 OR length(p_token) > 2000 THEN RETURN false; END IF;
  v_parts := string_to_array(p_token, '.');
  IF array_length(v_parts, 1) <> 2 THEN RETURN false; END IF;
  v_b64 := v_parts[1];
  SELECT value INTO v_secret FROM public.kft_security_config WHERE name = 'admin_token_secret';
  IF v_secret IS NULL THEN RETURN false; END IF;
  v_expect := encode(extensions.hmac(convert_to(v_b64, 'utf8'), convert_to(v_secret, 'utf8'), 'sha256'), 'hex');
  IF v_expect <> lower(v_parts[2]) THEN RETURN false; END IF;
  v_padded := translate(v_b64, '-_', '+/');
  v_padded := v_padded || repeat('=', (4 - length(v_padded) % 4) % 4);
  v_payload := convert_from(decode(v_padded, 'base64'), 'utf8')::jsonb;
  RETURN (v_payload->>'scope') = 'admin' AND (v_payload->>'exp')::bigint > extract(epoch from now())::bigint;
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.kft_admin_token_ok(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kft_admin_token_ok(text) TO anon, authenticated, service_role;

-- helper so the (non-definer) trigger can read the switch without table access
CREATE OR REPLACE FUNCTION public.kft_security_flag(p_name text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT value FROM public.kft_security_config WHERE name = p_name $$;
REVOKE ALL ON FUNCTION public.kft_security_flag(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kft_security_flag(text) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------ 3. the guard trigger
CREATE OR REPLACE FUNCTION public.kft_admin_keys_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  hdrs    text := current_setting('request.headers', true);
  v_key   text := CASE WHEN TG_OP = 'DELETE' THEN OLD.key ELSE NEW.key END;
  v_token text;
BEGIN
  IF v_key NOT IN ('kft_cloud_app_settings_v1', 'kft_cloud_admin_vip_pricing_v2', 'kft_admin_pin_security_v1') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- Trusted callers: SQL editor / migrations (no PostgREST request) and the service role (Edge Functions).
  IF hdrs IS NULL OR hdrs = '' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF coalesce(public.kft_security_flag('enforce_admin_keys'), 'off') = 'on' THEN
    BEGIN
      v_token := (hdrs::json) ->> 'x-kft-admin-token';
    EXCEPTION WHEN others THEN
      v_token := NULL;
    END;
    IF NOT public.kft_admin_token_ok(v_token) THEN
      RAISE EXCEPTION 'KFT_ADMIN_ONLY: writing % requires a valid admin token (log in to the Admin portal again)', v_key
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS c_kft_admin_keys_guard ON public.kft_app_kv_store;
CREATE TRIGGER c_kft_admin_keys_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.kft_app_kv_store
  FOR EACH ROW EXECUTE FUNCTION public.kft_admin_keys_guard();

-- ------------------------------------------------------------------ 4. self-test (read-only)
CREATE OR REPLACE FUNCTION public.kft_admin_selftest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
  v_now    bigint := extract(epoch from now())::bigint;
  v_b64    text;
  v_good   text;
  v_old    text;
  v_pin    text;
  v_sig    text;
  mk       text;
BEGIN
  SELECT value INTO v_secret FROM public.kft_security_config WHERE name = 'admin_token_secret';
  -- build tokens exactly like the Edge Function does: base64url(JSON) + '.' + hex(hmac_sha256(secret, base64url))
  v_b64 := rtrim(translate(encode(convert_to(format('{"sub":"admin","scope":"admin","iat":%s,"exp":%s}', v_now, v_now + 600), 'utf8'), 'base64'), E'+/\n', '-_'), '=');
  v_sig := encode(extensions.hmac(convert_to(v_b64, 'utf8'), convert_to(v_secret, 'utf8'), 'sha256'), 'hex');
  v_good := v_b64 || '.' || v_sig;
  v_b64 := rtrim(translate(encode(convert_to(format('{"sub":"admin","scope":"admin","iat":%s,"exp":%s}', v_now - 700, v_now - 100), 'utf8'), 'base64'), E'+/\n', '-_'), '=');
  v_old := v_b64 || '.' || encode(extensions.hmac(convert_to(v_b64, 'utf8'), convert_to(v_secret, 'utf8'), 'sha256'), 'hex');
  v_b64 := rtrim(translate(encode(convert_to(format('{"sub":"admin","scope":"pin","iat":%s,"exp":%s}', v_now, v_now + 600), 'utf8'), 'base64'), E'+/\n', '-_'), '=');
  v_pin := v_b64 || '.' || encode(extensions.hmac(convert_to(v_b64, 'utf8'), convert_to(v_secret, 'utf8'), 'sha256'), 'hex');
  RETURN jsonb_build_object(
    'valid_admin_token_accepted',   public.kft_admin_token_ok(v_good),
    'expired_token_rejected',       NOT public.kft_admin_token_ok(v_old),
    'pin_scope_token_rejected',     NOT public.kft_admin_token_ok(v_pin),
    'tampered_token_rejected',      NOT public.kft_admin_token_ok(substr(v_good, 1, length(v_good) - 1) || CASE WHEN right(v_good, 1) = 'a' THEN 'b' ELSE 'a' END),
    'garbage_rejected',             NOT public.kft_admin_token_ok('not-a-token'),
    'null_rejected',                NOT public.kft_admin_token_ok(NULL)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.kft_admin_selftest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kft_admin_selftest() TO service_role;

-- ------------------------------------------------------------------ verification (read-only)
SELECT
  (SELECT count(*) FROM public.kft_security_config WHERE name IN ('admin_token_secret', 'enforce_admin_keys')) AS config_rows_expected_2,
  (SELECT value FROM public.kft_security_config WHERE name = 'enforce_admin_keys')                           AS enforcement_expected_off,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'c_kft_admin_keys_guard' AND NOT tgisinternal)           AS trigger_expected_1,
  (SELECT count(*) FROM pg_class WHERE relname = 'kft_security_config' AND relrowsecurity)                 AS rls_on_expected_1,
  public.kft_admin_selftest()                                                                               AS selftest_all_true,
  (SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft_user_%')                               AS user_rows_untouched;
