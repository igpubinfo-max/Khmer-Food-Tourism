-- =====================================================================================
-- Cambodia Flavors & Tourism - Account Recovery & VIP Grant Guard Hotfix (v1)
-- Safe to re-run (idempotent).
--
-- Root Cause Fixed:
--   1. public.kft_vip_grant_guard() was created without SECURITY DEFINER, so when a regular
--      user (anon role) logged in after account deletion/re-registration to restore their
--      verified VIP subscription on kft_user_<id>, checking public.kft_used_aba_transactions
--      or public.kft_payment_receipts threw HTTP 401 (SQLSTATE 42501: permission denied).
--   2. Enhances public.kft_vip_grant_guard() to permit restoring a verified VIP subscription
--      when the user's transactionRef is verified in public.kft_used_aba_transactions,
--      public.kft_payment_receipts, or kft_cloud_transactions_v1 for that user/email.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.kft_vip_grant_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hdrs            text := current_setting('request.headers', true);
  v_mode          text;
  v_tok           text;
  old_p           jsonb;
  new_p           jsonb := NEW.payload;
  old_exp         timestamptz;
  new_exp         timestamptz;
  old_active      boolean := false;
  new_active      boolean := false;
  is_grant        boolean := false;
  slots_up        boolean := false;
  is_trial_7d     boolean := false;
  is_reward       boolean := false;
  is_verified_ref boolean := false;
  v_trx_key       text;
  v_user_id       text;
  v_user_email    text;
  f               text;
  vip_fields      text[] := ARRAY['membershipTier','subscriptionStatus','vipStatus','paymentStatus','subscriptionStartDate',
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

  -- 1. Valid Admin token is always allowed
  BEGIN
    v_tok := (hdrs::json) ->> 'x-kft-admin-token';
  EXCEPTION WHEN others THEN
    v_tok := NULL;
  END;
  IF public.kft_admin_token_ok(v_tok) THEN RETURN NEW; END IF;

  -- 2. Legitimate Verified Payment Recovery (Account Re-registration / Multi-device Sync)
  v_trx_key := upper(regexp_replace(coalesce(new_p->>'transactionRef', ''), '[^0-9A-Za-z]', '', 'g'));
  v_user_id := coalesce(new_p->>'id', substring(NEW.key FROM 10));
  v_user_email := lower(trim(coalesce(new_p->>'email', '')));

  IF is_grant AND NOT slots_up AND length(v_trx_key) >= 6 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.kft_used_aba_transactions u
      WHERE u.trx_key = v_trx_key
        AND u.payment_status = 'completed'
        AND (
          u.user_id = v_user_id
          OR (v_user_email <> '' AND lower(trim(coalesce(u.user_email, ''))) = v_user_email)
        )
    ) OR EXISTS (
      SELECT 1 FROM public.kft_payment_receipts r
      WHERE r.trx_key = v_trx_key
        AND r.status = 'verified'
        AND (
          r.user_id = v_user_id
          OR (v_user_email <> '' AND lower(trim(coalesce(r.user_email, ''))) = v_user_email)
        )
    ) INTO is_verified_ref;

    IF is_verified_ref THEN RETURN NEW; END IF;
  END IF;

  -- 3. Legitimate 1-time 3-day Check-in Reward
  is_reward := is_grant
           AND NOT slots_up
           AND (new_p->>'foodCheckInRewardAt') IS NOT NULL
           AND (old_p IS NULL OR (old_p->>'foodCheckInRewardAt') IS NULL)
           AND coalesce((new_p->>'vipPlanDays')::int, 0) <= 3
           AND new_exp <= coalesce(GREATEST(old_exp, now()), now()) + interval '4 days';
  IF is_reward THEN RETURN NEW; END IF;

  -- 4. Legitimate 1-time 7-day Consumer Free Trial verified by server trial_promo_claims
  is_trial_7d := is_grant
             AND NOT slots_up
             AND coalesce((new_p->>'freeTrialActivated')::boolean, false) = true
             AND NOT coalesce((old_p->>'freeTrialActivated')::boolean, false)
             AND new_exp <= now() + interval '8 days'
             AND EXISTS (
               SELECT 1 FROM public.kft_trial_promo_claims c
               WHERE c.claim_type = 'trial_7d'
                 AND c.user_id = v_user_id
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

COMMIT;
