-- =====================================================================================
-- Cambodia Flavors & Tourism - Consumer Trial/Promo Guard & Shop Subscription Ledger v1
-- Safe to re-run (100% additive & idempotent). Touches NO existing user / shop / KV rows.
-- Requires supabase_vip_security_v1.sql first.
--
-- What it adds:
--   1. public.kft_trial_promo_claims : PRIVATE service-role-only ledger enforcing the
--      Two-Line Anti-Abuse Rule for 1-time 7-Day Free Trial ('trial_7d') and 1-time
--      $0.99 Win-Back Promo ('consumer_promo_30d'):
--        * Unique per (claim_type, user_id)
--        * Unique per (claim_type, identity_hash)  [normalized Gmail / +855 phone SHA-256]
--        * Unique per (claim_type, device_hash)    [salted Android / Web device SHA-256]
--      NOTE: Paid Consumer VIP & Shop plans NEVER check device_hash on login, so a VIP
--      user who buys a new phone keeps 100% of their VIP access when signing in!
--   2. Additive plan_id & shop_id columns on public.kft_payment_receipts so Consumer VIP
--      ($0.99 / $2.99 / $6.99 / $19.99) and Independent Shop Subscriptions ($6.99 / $49.99 /
--      $59.99) share the same anti-replay receipt & ABA Statement Matcher pipeline.
-- =====================================================================================

-- ------------------------------------------------------------------ 1. trial & promo claims
CREATE TABLE IF NOT EXISTS public.kft_trial_promo_claims (
  id            bigserial   PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  claim_type    text        NOT NULL CHECK (claim_type IN ('trial_7d', 'consumer_promo_30d')),
  user_id       text        NOT NULL,
  identity_hash text,
  device_hash   text,
  expires_at    timestamptz,
  meta          jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_kft_trial_promo_user
  ON public.kft_trial_promo_claims (claim_type, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_kft_trial_promo_identity
  ON public.kft_trial_promo_claims (claim_type, identity_hash)
  WHERE identity_hash IS NOT NULL AND identity_hash <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_kft_trial_promo_device
  ON public.kft_trial_promo_claims (claim_type, device_hash)
  WHERE device_hash IS NOT NULL AND device_hash <> '';

CREATE INDEX IF NOT EXISTS idx_kft_trial_promo_created
  ON public.kft_trial_promo_claims (created_at DESC);

ALTER TABLE public.kft_trial_promo_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kft_trial_promo_claims FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.kft_trial_promo_claims_id_seq FROM anon, authenticated;

-- ------------------------------------------------------------------ 2. additive plan & shop columns on receipts
ALTER TABLE public.kft_payment_receipts
  ADD COLUMN IF NOT EXISTS plan_id text,
  ADD COLUMN IF NOT EXISTS shop_id text;

CREATE INDEX IF NOT EXISTS idx_kft_receipts_plan_shop
  ON public.kft_payment_receipts (plan_id, shop_id)
  WHERE plan_id IS NOT NULL;

-- ------------------------------------------------------------------ 3. verification (read-only)
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'kft_trial_promo_claims') AS trial_claims_table_expected_1,
  (SELECT count(*) FROM pg_class WHERE relname = 'kft_trial_promo_claims' AND relrowsecurity)                              AS rls_on_expected_1,
  (SELECT count(*) FROM pg_indexes WHERE indexname IN ('uq_kft_trial_promo_user', 'uq_kft_trial_promo_identity', 'uq_kft_trial_promo_device')) AS unique_indexes_expected_3,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kft_payment_receipts' AND column_name IN ('plan_id', 'shop_id')) AS receipt_new_cols_expected_2;
