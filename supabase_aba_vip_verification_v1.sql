-- =============================================================================
-- Cambodia Flavors & Tourism — Strict ABA VIP Renewal Verification System (v1)
-- Centralized Used Transaction ID Ledger + Complete Payment Audit Log + Backfill
-- =============================================================================

BEGIN;

-- 1. Centralized Used ABA Transactions Table (One ABA Trx ID = One Activation/Renewal Globally)
CREATE TABLE IF NOT EXISTS public.kft_used_aba_transactions (
  trx_key            TEXT PRIMARY KEY,
  raw_trx_id         TEXT NOT NULL,
  image_hash         TEXT,
  txn_id             TEXT,
  user_id            TEXT NOT NULL,
  user_email         TEXT,
  amount_usd         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'USD',
  plan_id            TEXT,
  duration_days      INT,
  transaction_date   TEXT,
  payment_status     TEXT NOT NULL DEFAULT 'completed',
  statement_matched  BOOLEAN NOT NULL DEFAULT false,
  statement_row_ref  TEXT,
  approved_by        TEXT NOT NULL DEFAULT 'system',
  used_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_kft_used_aba_image_hash
  ON public.kft_used_aba_transactions (image_hash)
  WHERE image_hash IS NOT NULL AND length(image_hash) > 0;

CREATE INDEX IF NOT EXISTS idx_kft_used_aba_user
  ON public.kft_used_aba_transactions (user_id, used_at DESC);

ALTER TABLE public.kft_used_aba_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kft_used_aba_transactions FROM anon, authenticated;

-- 2. Complete Payment Verification & Approval Audit Log
CREATE TABLE IF NOT EXISTS public.kft_payment_audit_log (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type      TEXT NOT NULL,
  txn_id          TEXT,
  trx_key         TEXT,
  image_hash      TEXT,
  user_id         TEXT,
  user_email      TEXT,
  amount_usd      NUMERIC(10, 2),
  plan_id         TEXT,
  duration_days   INT,
  payment_status  TEXT,
  actor           TEXT NOT NULL DEFAULT 'system',
  ip_address      TEXT,
  details         JSONB
);

CREATE INDEX IF NOT EXISTS idx_kft_payment_audit_created
  ON public.kft_payment_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kft_payment_audit_trx
  ON public.kft_payment_audit_log (trx_key)
  WHERE trx_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kft_payment_audit_user
  ON public.kft_payment_audit_log (user_id, created_at DESC);

ALTER TABLE public.kft_payment_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kft_payment_audit_log FROM anon, authenticated;

-- 3. Extend public.kft_payment_receipts with strict verification & statement-match metadata
ALTER TABLE public.kft_payment_receipts
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS transaction_date TEXT,
  ADD COLUMN IF NOT EXISTS is_modified_or_fake BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS statement_matched BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS txn_id TEXT;

-- Ensure unique verified trx_key index exists on kft_payment_receipts
CREATE UNIQUE INDEX IF NOT EXISTS uq_kft_receipts_trx_ver
  ON public.kft_payment_receipts (trx_key)
  WHERE status = 'verified' AND trx_key IS NOT NULL;

-- 4. Backfill already-verified ABA transactions from kft_cloud_transactions_v1 into kft_used_aba_transactions
INSERT INTO public.kft_used_aba_transactions (
  trx_key,
  raw_trx_id,
  txn_id,
  user_id,
  user_email,
  amount_usd,
  currency,
  plan_id,
  duration_days,
  transaction_date,
  payment_status,
  statement_matched,
  approved_by,
  used_at
)
SELECT DISTINCT ON (upper(regexp_replace(trim(elem->>'transactionRef'), '[^0-9A-Za-z]', '', 'g')))
  upper(regexp_replace(trim(elem->>'transactionRef'), '[^0-9A-Za-z]', '', 'g')) AS trx_key,
  trim(elem->>'transactionRef') AS raw_trx_id,
  elem->>'id' AS txn_id,
  COALESCE(NULLIF(elem->>'userId', ''), NULLIF(elem->>'ownerId', ''), 'legacy_user') AS user_id,
  elem->>'userEmail' AS user_email,
  COALESCE(NULLIF(elem->>'amountUsd', '')::numeric, 0) AS amount_usd,
  COALESCE(NULLIF(elem->>'currency', ''), 'USD') AS currency,
  elem->>'planId' AS plan_id,
  COALESCE(NULLIF(elem->>'durationDays', '')::int, 30) AS duration_days,
  COALESCE(elem->'aiVerificationReport'->'extractedReceipt'->>'transactionDate', elem->>'createdAt') AS transaction_date,
  'completed' AS payment_status,
  true AS statement_matched,
  COALESCE(NULLIF(elem->>'verifiedBy', ''), 'legacy_verified_backfill') AS approved_by,
  now() AS used_at
FROM public.kft_app_kv_store kv,
     jsonb_array_elements(
       CASE
         WHEN jsonb_typeof(kv.payload) = 'array' THEN kv.payload
         WHEN jsonb_typeof(kv.payload->'data') = 'array' THEN kv.payload->'data'
         ELSE '[]'::jsonb
       END
     ) elem
WHERE kv.key = 'kft_cloud_transactions_v1'
  AND elem->>'status' = 'verified'
  AND elem->>'transactionRef' IS NOT NULL
  AND length(regexp_replace(trim(elem->>'transactionRef'), '[^0-9A-Za-z]', '', 'g')) >= 6
  AND elem->>'transactionRef' !~* '^(ABA-KHQR-|ADMIN-VIP-|ABA-STORE-|AUTO)'
ON CONFLICT (trx_key) DO NOTHING;

-- Also backfill any verified rows in kft_payment_receipts for those backfilled transactions
INSERT INTO public.kft_payment_receipts (
  user_id,
  user_email,
  txn_id,
  image_hash,
  trx_key,
  amount_usd,
  plan_days,
  status,
  payment_status,
  transaction_date,
  statement_matched,
  reviewed_by,
  approved_at,
  extracted,
  reasons
)
SELECT
  u.user_id,
  u.user_email,
  u.txn_id,
  'backfill_trx_' || u.trx_key,
  u.trx_key,
  u.amount_usd,
  u.duration_days,
  'verified',
  'completed',
  u.transaction_date,
  true,
  u.approved_by,
  u.used_at,
  jsonb_build_object(
    'isAbaReceipt', true,
    'trxId', u.raw_trx_id,
    'amountUsd', u.amount_usd,
    'currency', u.currency,
    'transactionDate', u.transaction_date,
    'paymentStatus', 'completed'
  ),
  '["backfilled_from_verified_transactions"]'::jsonb
FROM public.kft_used_aba_transactions u
WHERE NOT EXISTS (
  SELECT 1 FROM public.kft_payment_receipts r
  WHERE r.trx_key = u.trx_key AND r.status = 'verified'
)
ON CONFLICT DO NOTHING;

COMMIT;