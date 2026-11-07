-- =====================================================================================
-- Cambodia Flavors & Tourism - VIP security migration v1  (Phase B2, step 1)
-- Safe to re-run. Touches NO existing user / VIP / shop data. Requires supabase_admin_security_v1.sql first.
--
-- Problem it solves
--   VIP is granted by the APP: any device (or anyone with the public anon key) can write
--   {"membershipTier":"premium_vip","subscriptionExpiryDate":"2099-..."} into a `kft_user_*` row and get free VIP -
--   including a brand-new row (INSERT is not covered by the older guard).
--
-- What it adds
--   1. kft_payment_receipts  : PRIVATE ledger of every receipt checked by the `vip-purchase` Edge Function.
--                               UNIQUE image hash + UNIQUE verified Trx ID  => a receipt can be used once, ever.
--   2. kft_security_events   : PRIVATE log of suspicious writes (VIP grants that did not come from the server / admin).
--   3. kft_vip_grant_guard   : trigger on `kft_user_*` rows. A "grant" = VIP becomes active, or its expiry moves later, or
--                               paidAdditionalStoreSlots increases. Trusted writers: the service role (Edge Functions),
--                               the SQL editor, and a valid admin token. Everyone else is handled by the MODE:
--        'off'    -> nothing happens (current behaviour)
--        'shadow' -> the write goes through but is LOGGED in kft_security_events   <-- starts here
--        'on'     -> the VIP / store-slot fields of the write are silently reverted to the stored values
--
-- Switch:   UPDATE public.kft_security_config SET value = 'shadow' | 'on' | 'off' WHERE name = 'enforce_vip_grants';
-- Watch:    SELECT * FROM public.kft_security_events ORDER BY at DESC LIMIT 50;
-- =====================================================================================

-- ------------------------------------------------------------------ 1. receipts ledger
CREATE TABLE IF NOT EXISTS public.kft_payment_receipts (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     text        NOT NULL,
  image_hash  text        NOT NULL,                       -- sha-256 of the receipt image bytes
  trx_key     text,                                       -- upper-case Trx ID read from the receipt
  amount_usd  numeric,
  plan_days   integer,
  status      text        NOT NULL CHECK (status IN ('verified', 'pending', 'rejected')),
  extracted   jsonb,
  reasons     jsonb,
  grant_info  jsonb,
  reviewed_by text
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_kft_receipts_image   ON public.kft_payment_receipts (image_hash);
CREATE UNIQUE INDEX IF NOT EXISTS uq_kft_receipts_trx_ver ON public.kft_payment_receipts (trx_key) WHERE status = 'verified' AND trx_key IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_kft_receipts_user   ON public.kft_payment_receipts (user_id, created_at DESC);
ALTER TABLE public.kft_payment_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kft_payment_receipts FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.kft_payment_receipts_id_seq FROM anon, authenticated;

-- ------------------------------------------------------------------ 2. security events
CREATE TABLE IF NOT EXISTS public.kft_security_events (
  id     bigserial PRIMARY KEY,
  at     timestamptz NOT NULL DEFAULT now(),
  kind   text        NOT NULL,
  mode   text,
  key    text,
  detail jsonb
);
CREATE INDEX IF NOT EXISTS idx_kft_security_events_at ON public.kft_security_events (at DESC);
ALTER TABLE public.kft_security_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kft_security_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.kft_security_events_id_seq FROM anon, authenticated;

-- the (non-definer) trigger cannot insert into the private table itself -> definer helper
CREATE OR REPLACE FUNCTION public.kft_log_security_event(p_kind text, p_mode text, p_key text, p_detail jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.kft_security_events (kind, mode, key, detail) VALUES (p_kind, p_mode, p_key, p_detail);
  -- keep the log bounded
  DELETE FROM public.kft_security_events WHERE at < now() - interval '60 days';
EXCEPTION WHEN others THEN
  NULL; -- logging must never block a user write
END;
$$;
REVOKE ALL ON FUNCTION public.kft_log_security_event(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kft_log_security_event(text, text, text, jsonb) TO anon, authenticated, service_role;

INSERT INTO public.kft_security_config (name, value)
VALUES ('enforce_vip_grants', 'shadow')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------ 3. the guard
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
  f           text;
  vip_fields  text[] := ARRAY['membershipTier','subscriptionStatus','vipStatus','paymentStatus','subscriptionStartDate',
                              'subscriptionExpiryDate','vipExpiresAt','vipPlanDays','vipPlanType','transactionRef'];
BEGIN
  IF NEW.key NOT LIKE 'kft\_user\_%' ESCAPE '\' THEN RETURN NEW; END IF;
  IF jsonb_typeof(new_p) <> 'object' THEN RETURN NEW; END IF;
  -- trusted: SQL editor / migrations (no PostgREST request) and the service role (Edge Functions)
  IF hdrs IS NULL OR hdrs = '' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN RETURN NEW; END IF;

  v_mode := coalesce(public.kft_security_flag('enforce_vip_grants'), 'off');
  IF v_mode NOT IN ('shadow', 'on') THEN RETURN NEW; END IF;

  new_exp    := public.kft_try_ts(coalesce(new_p->>'subscriptionExpiryDate', new_p->>'vipExpiresAt'));
  new_active := coalesce(new_p->>'membershipTier', '') = 'premium_vip'
            AND coalesce(new_p->>'subscriptionStatus', '') <> 'cancelled'
            AND (new_p->>'vipCancelledAt') IS NULL
            AND new_exp IS NOT NULL AND new_exp > now();

  -- The app writes with an UPSERT (INSERT .. ON CONFLICT DO UPDATE): the BEFORE INSERT trigger has no OLD row, so look the
  -- stored row up ourselves. (If it exists, we compare against it and revert to it, which is exactly what the later
  -- UPDATE step of the upsert will then see.)
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

  -- a valid admin token (admin grants VIP from the Admin portal) is allowed
  BEGIN
    v_tok := (hdrs::json) ->> 'x-kft-admin-token';
  EXCEPTION WHEN others THEN
    v_tok := NULL;
  END;
  IF public.kft_admin_token_ok(v_tok) THEN RETURN NEW; END IF;

  PERFORM public.kft_log_security_event(
    'vip_grant_without_server',
    v_mode,
    NEW.key,
    jsonb_build_object(
      'op', TG_OP,
      'old_active', old_active, 'new_active', new_active,
      'old_exp', old_exp, 'new_exp', new_exp,
      'plan', new_p->>'vipPlanType', 'ref', new_p->>'transactionRef', 'method', new_p->>'paymentMethod',
      'slots_up', slots_up, 'reward', new_p->>'foodCheckInRewardAt'
    )
  );

  IF v_mode = 'shadow' THEN RETURN NEW; END IF;

  -- mode 'on': keep the stored entitlement, discard the forged / unpaid change
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

DROP TRIGGER IF EXISTS d_kft_vip_grant_guard ON public.kft_app_kv_store;
-- Fires for INSERT (incl. the INSERT half of an upsert) and UPDATE.
CREATE TRIGGER d_kft_vip_grant_guard
  BEFORE INSERT OR UPDATE ON public.kft_app_kv_store
  FOR EACH ROW EXECUTE FUNCTION public.kft_vip_grant_guard();

-- ------------------------------------------------------------------ report helpers (service role / SQL editor)
CREATE OR REPLACE FUNCTION public.kft_vip_security_report(p_days integer DEFAULT 7)
RETURNS TABLE (day date, mode text, events bigint, distinct_keys bigint, with_reward bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (at AT TIME ZONE 'Asia/Phnom_Penh')::date, mode, count(*), count(DISTINCT key),
         count(*) FILTER (WHERE detail->>'reward' IS NOT NULL)
  FROM public.kft_security_events
  WHERE kind = 'vip_grant_without_server' AND at >= now() - make_interval(days => GREATEST(p_days, 1))
  GROUP BY 1, 2 ORDER BY 1 DESC, 2;
$$;
REVOKE ALL ON FUNCTION public.kft_vip_security_report(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kft_vip_security_report(integer) TO service_role;

-- ------------------------------------------------------------------ verification (read-only)
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('kft_payment_receipts', 'kft_security_events')) AS new_tables_expected_2,
  (SELECT value FROM public.kft_security_config WHERE name = 'enforce_vip_grants')                                                         AS mode_expected_shadow,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'd_kft_vip_grant_guard' AND NOT tgisinternal)                                           AS trigger_expected_1,
  (SELECT count(*) FROM pg_class WHERE relname IN ('kft_payment_receipts', 'kft_security_events') AND relrowsecurity)                     AS rls_on_expected_2,
  (SELECT count(*) FROM pg_indexes WHERE indexname IN ('uq_kft_receipts_image', 'uq_kft_receipts_trx_ver'))                              AS unique_indexes_expected_2,
  (SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft_user_%')                                                              AS user_rows_untouched;
