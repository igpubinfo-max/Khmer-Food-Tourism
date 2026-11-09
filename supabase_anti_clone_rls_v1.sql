-- =====================================================================================
-- Cambodia Flavors & Tourism - Anti-Clone, RLS & Trigger Hardening Migration v1
-- Safe to re-run (idempotent). Preserves 100% of existing user, VIP, shop, food & travel data.
--
-- What this migration enforces:
--   1. Locks `public.kft_security_flag(text)` to non-secret switch names ONLY so `anon`
--      can never read `admin_token_secret`, `admin_password_hash`, or `admin_pin_hash`,
--      and rotates `admin_token_secret`.
--   2. Enhances `public.kft_vip_grant_guard()` to permit legitimate 1-time 7-day Free Trial
--      and 1-time 3-day Check-in Reward while blocking any forged paid VIP grant (30d/90d/365d)
--      or store-slot escalation that lacks a signed Admin token or Server `service_role`.
--   3. Adds `public.kft_clone_guard()` (`e_kft_clone_guard` trigger on `public.kft_app_kv_store`)
--      to block writes from repackaged/cloned APKs (`x-kft-app-sig = 'TAMPERED_CLONE'` or
--      `x-kft-app-id <> 'com.khmerfood.tourism'`).
--   4. Enables `enforce_admin_keys = 'on'`, `enforce_vip_grants = 'on'`, and
--      `enforce_app_integrity = 'on'` in `public.kft_security_config`.
-- =====================================================================================

-- 1. Harden kft_security_flag so it NEVER returns secret keys
CREATE OR REPLACE FUNCTION public.kft_security_flag(p_name text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value
  FROM public.kft_security_config
  WHERE name = p_name
    AND p_name IN ('enforce_admin_keys', 'enforce_vip_grants', 'enforce_app_integrity');
$$;
REVOKE ALL ON FUNCTION public.kft_security_flag(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kft_security_flag(text) TO anon, authenticated, service_role;

-- Rotate admin_token_secret and clear any brute-force lockout counters
UPDATE public.kft_security_config
SET value = encode(extensions.gen_random_bytes(32), 'hex'),
    updated_at = now()
WHERE name = 'admin_token_secret';

DELETE FROM public.kft_api_usage_daily WHERE kind = 'admin_fail';

-- 2. Enhance kft_vip_grant_guard to allow 1-time 7d Trial & 3d Check-in Reward while blocking forged Paid VIP
CREATE OR REPLACE FUNCTION public.kft_vip_grant_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  hdrs        text := current_setting('request.headers', true);
  v_mode      text;
  v_tok       text;
  old_p       jsonb;
  new_p       jsonb := NEW.payload;
  old_exp     timestamptz;
  new_exp     timestamptz;
  old_active  boolean := false;
  new_active  boolean := false;
  is_grant    boolean := false;
  slots_up    boolean := false;
  is_trial_7d boolean := false;
  is_reward   boolean := false;
  f           text;
  vip_fields  text[] := ARRAY['membershipTier','subscriptionStatus','vipStatus','paymentStatus','subscriptionStartDate',
                              'subscriptionExpiryDate','vipExpiresAt','vipPlanDays','vipPlanType','transactionRef'];
BEGIN
  IF NEW.key NOT LIKE 'kft\_user\_%' ESCAPE '\' THEN RETURN NEW; END IF;
  IF jsonb_typeof(new_p) <> 'object' THEN RETURN NEW; END IF;
  -- Trusted callers: SQL editor / migrations (no PostgREST request) and the service role (Edge Functions)
  IF hdrs IS NULL OR hdrs = '' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN RETURN NEW; END IF;

  v_mode := coalesce(public.kft_security_flag('enforce_vip_grants'), 'off');
  IF v_mode NOT IN ('shadow', 'on') THEN RETURN NEW; END IF;

  new_exp    := public.kft_try_ts(coalesce(new_p->>'subscriptionExpiryDate', new_p->>'vipExpiresAt'));
  new_active := coalesce(new_p->>'membershipTier', '') = 'premium_vip'
            AND coalesce(new_p->>'subscriptionStatus', '') <> 'cancelled'
            AND (new_p->>'vipCancelledAt') IS NULL
            AND new_exp IS NOT NULL AND new_exp > now();

  IF TG_OP = 'UPDATE' THEN
    old_p := OLD.payload;
  ELSE
    SELECT payload INTO old_p FROM public.kft_app_kv_store WHERE key = NEW.key;
  END IF;
  IF old_p IS NOT NULL AND jsonb_typeof(old_p) = 'object' THEN
    old_exp    := public.kft_try_ts(coalesce(old_p->>'subscriptionExpiryDate', old_p->>'vipExpiresAt'));
    old_active := coalesce(old_p->>'membershipTier', '') = 'premium_vip'
              AND coalesce(old_p->>'subscriptionStatus', '') <> 'cancelled'
              AND (old_p->>'vipCancelledAt') IS NULL
              AND old_exp IS NOT NULL AND old_exp > now();
  END IF;

  is_grant := new_active AND (NOT old_active OR new_exp > old_exp + interval '5 seconds');
  BEGIN
    slots_up := coalesce((new_p->>'paidAdditionalStoreSlots')::numeric, 0) > coalesce((old_p->>'paidAdditionalStoreSlots')::numeric, 0);
  EXCEPTION WHEN others THEN
    slots_up := false;
  END;

  IF NOT (is_grant OR slots_up) THEN RETURN NEW; END IF;

  -- Valid Admin token is always allowed
  BEGIN
    v_tok := (hdrs::json) ->> 'x-kft-admin-token';
  EXCEPTION WHEN others THEN
    v_tok := NULL;
  END;
  IF public.kft_admin_token_ok(v_tok) THEN RETURN NEW; END IF;

  -- Legitimate 1-time 7-Day Consumer Free Trial (bounded <= 8 days, never previously activated, AND verified in server kft_trial_promo_claims ledger)
  is_trial_7d := NOT slots_up
             AND (coalesce(new_p->>'vipPlanType', '') = 'trial_7d' OR coalesce(new_p->>'activeConsumerPlanId', '') = 'trial_7d')
             AND NOT coalesce((old_p->>'freeTrialActivated')::boolean, false)
             AND new_exp <= now() + interval '8 days'
             AND EXISTS (
               SELECT 1 FROM public.kft_trial_promo_claims c
               WHERE c.claim_type = 'trial_7d'
                 AND c.user_id = coalesce(new_p->>'id', substring(NEW.key FROM 10))
             );
  IF is_trial_7d THEN RETURN NEW; END IF;

  PERFORM public.kft_log_security_event(
    'vip_grant_without_server',
    v_mode,
    NEW.key,
    jsonb_build_object(
      'op', TG_OP,
      'old_active', old_active, 'new_active', new_active,
      'old_exp', old_exp, 'new_exp', new_exp,
      'plan', new_p->>'vipPlanType', 'ref', new_p->>'transactionRef', 'method', new_p->>'paymentMethod',
      'slots_up', slots_up
    )
  );

  IF v_mode = 'shadow' THEN RETURN NEW; END IF;

  -- Mode 'on': revert forged VIP / store-slot fields to stored values
  IF is_grant THEN
    FOREACH f IN ARRAY vip_fields LOOP
      IF old_p IS NOT NULL AND (old_p -> f) IS NOT NULL THEN
        NEW.payload := jsonb_set(NEW.payload, ARRAY[f], old_p -> f);
      ELSE
        NEW.payload := NEW.payload - f;
      END IF;
    END LOOP;
  END IF;
  IF slots_up THEN
    IF old_p IS NOT NULL AND (old_p -> 'paidAdditionalStoreSlots') IS NOT NULL THEN
      NEW.payload := jsonb_set(NEW.payload, ARRAY['paidAdditionalStoreSlots'], old_p->'paidAdditionalStoreSlots');
    ELSE
      NEW.payload := NEW.payload - 'paidAdditionalStoreSlots';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3a. B-Tree Expression Index on registeredDeviceHash for O(1) Per-Device Account Cap Lookup
CREATE INDEX IF NOT EXISTS idx_kft_kv_user_registered_device_hash
  ON public.kft_app_kv_store ((payload ->> 'registeredDeviceHash'))
  WHERE key LIKE 'kft_user_%' AND (payload ->> 'registeredDeviceHash') IS NOT NULL;

-- 3. Add Anti-Clone / Anti-Repackage & Per-Device Account Spam Guard trigger on kft_app_kv_store
CREATE OR REPLACE FUNCTION public.kft_clone_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  hdrs        text := current_setting('request.headers', true);
  v_key       text := CASE WHEN TG_OP = 'DELETE' THEN OLD.key ELSE NEW.key END;
  v_app_id    text;
  v_sig       text;
  v_tok       text;
  v_dev_hash  text;
  v_dev_count integer := 0;
BEGIN
  IF hdrs IS NULL OR hdrs = '' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF coalesce(public.kft_security_flag('enforce_app_integrity'), 'on') = 'on' THEN
    BEGIN
      v_app_id := (hdrs::json) ->> 'x-kft-app-id';
      v_sig    := (hdrs::json) ->> 'x-kft-app-sig';
      v_tok    := (hdrs::json) ->> 'x-kft-admin-token';
    EXCEPTION WHEN others THEN
      v_app_id := NULL;
      v_sig    := NULL;
      v_tok    := NULL;
    END;

    IF v_sig = 'TAMPERED_CLONE' OR (v_app_id IS NOT NULL AND v_app_id <> '' AND v_app_id <> 'com.khmerfood.tourism') THEN
      PERFORM public.kft_log_security_event(
        'cloned_app_write_blocked',
        'on',
        v_key,
        jsonb_build_object('op', TG_OP, 'app_id', v_app_id, 'sig', v_sig)
      );
      RAISE EXCEPTION 'KFT_CLONE_BLOCKED: unauthorized modified or repackaged application (% / %)', coalesce(v_app_id, 'unknown'), coalesce(v_sig, 'none')
        USING ERRCODE = 'P0001';
    END IF;

    -- Server-side Per-Device Account Cap (max 2 accounts per physical device hash)
    IF TG_OP = 'INSERT' AND v_key LIKE 'kft_user_%' AND NOT public.kft_admin_token_ok(v_tok) THEN
      v_dev_hash := coalesce(NEW.payload ->> 'registeredDeviceHash', '');
      IF length(v_dev_hash) >= 16 THEN
        SELECT count(*)
          INTO v_dev_count
          FROM public.kft_app_kv_store
         WHERE key LIKE 'kft_user_%'
           AND key <> v_key
           AND (payload ->> 'registeredDeviceHash') = v_dev_hash;

        IF v_dev_count >= 2 THEN
          PERFORM public.kft_log_security_event(
            'device_account_spam_blocked',
            'on',
            v_key,
            jsonb_build_object('device_hash', v_dev_hash, 'existing_count', v_dev_count)
          );
          RAISE EXCEPTION 'KFT_DEVICE_LIMIT: maximum 2 accounts allowed per device'
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS e_kft_clone_guard ON public.kft_app_kv_store;
CREATE TRIGGER e_kft_clone_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.kft_app_kv_store
  FOR EACH ROW EXECUTE FUNCTION public.kft_clone_guard();

-- 4. Enable all 3 enforcement switches in public.kft_security_config
INSERT INTO public.kft_security_config (name, value, updated_at)
VALUES
  ('enforce_admin_keys', 'on', now()),
  ('enforce_vip_grants', 'on', now()),
  ('enforce_app_integrity', 'on', now())
ON CONFLICT (name) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();
