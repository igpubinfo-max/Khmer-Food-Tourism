-- =====================================================================================
-- Cambodia Flavors & Tourism - Security Hardening Migration v2
-- Safe to re-run (idempotent). Preserves 100% of existing user, VIP, shop & media data.
--
-- Closes Audit Findings:
--   1. G2 (Account Takeover): Prevents unauthenticated callers from overwriting or erasing
--      `email`, `googleSub`, `phone`, or `passwordHash` on existing `kft_user_*` rows.
--   2. G3 (Role Privilege Escalation): Prevents unauthenticated callers from setting
--      `role` to `admin` or `owner` on `kft_user_*` rows (on both INSERT and UPDATE).
--   3. H5 (Destructive Header Bypass): Requires a valid signed Admin token
--      (`public.kft_admin_token_ok(x-kft-admin-token)`) whenever `x-kft-allow-destructive: true`
--      is sent over the REST API to delete protected rows or shrink aggregate user lists.
--   4. H3 (Storage Bucket `food-media` Unrestricted Write/Delete): Replaces the permissive
--      `FOR ALL` policy on `storage.objects` with granular policies:
--        - Public `SELECT` (read images)
--        - Restricted `INSERT` (image file extensions only: jpg, jpeg, png, webp, gif, avif)
--        - Blocks anonymous `UPDATE` (overwrite) and `DELETE` on `food-media`.
-- =====================================================================================

-- 1. Harden kft_kv_guard() and attach BEFORE INSERT OR UPDATE OR DELETE on kft_app_kv_store
CREATE OR REPLACE FUNCTION public.kft_kv_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  hdrs            text    := current_setting('request.headers', true);
  via_api         boolean := (hdrs IS NOT NULL AND hdrs <> '' AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role'));
  v_key           text    := CASE WHEN TG_OP = 'DELETE' THEN OLD.key ELSE NEW.key END;
  v_tok           text    := NULL;
  v_prev_pw_hash  text    := NULL;
  v_admin_ok      boolean := false;
  allow_flag      boolean := false;
  old_p           jsonb   := NULL;
  old_len         int;
  new_len         int;
  old_exp         timestamptz;
  new_exp         timestamptz;
  old_active      boolean;
  new_cancel      boolean;
BEGIN
  IF NOT public.kft_is_protected_key(v_key) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF via_api THEN
    BEGIN
      v_tok          := (hdrs::json) ->> 'x-kft-admin-token';
      v_prev_pw_hash := (hdrs::json) ->> 'x-kft-prev-pw-hash';
      v_admin_ok     := public.kft_admin_token_ok(v_tok);
      allow_flag     := coalesce((hdrs::json) ->> 'x-kft-allow-destructive', '') = 'true'
                        AND (
                          coalesce(public.kft_security_flag('enforce_admin_keys'), 'on') <> 'on'
                          OR v_admin_ok
                        );
    EXCEPTION WHEN others THEN
      v_admin_ok := false;
      allow_flag := false;
    END;
  END IF;

  -- Trusted server callers (SQL editor / service_role) or verified Admin with explicit destructive flag
  IF (NOT via_api) OR (v_admin_ok AND allow_flag) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'KFT_GUARD: delete of protected key % blocked (intentional admin deletes must send x-kft-allow-destructive with a valid x-kft-admin-token)', OLD.key
      USING ERRCODE = 'P0001';
  END IF;

  -- Resolve existing payload even if PostgREST routes an upsert through INSERT
  IF TG_OP = 'UPDATE' THEN
    old_p := OLD.payload;
  ELSE
    SELECT payload INTO old_p FROM public.kft_app_kv_store WHERE key = NEW.key;
  END IF;

  -- 4a. Whole-list user aggregates may never shrink by more than 20% in a single write without verified Admin override
  IF NEW.key IN ('kft_cloud_users_v1', 'kft_cloud_users_v2') THEN
    IF old_p IS NOT NULL AND jsonb_typeof(old_p) = 'array' THEN
      IF jsonb_typeof(NEW.payload) <> 'array' THEN
        RAISE EXCEPTION 'KFT_GUARD: % must stay a JSON array', NEW.key USING ERRCODE = 'P0001';
      END IF;
      old_len := jsonb_array_length(old_p);
      new_len := jsonb_array_length(NEW.payload);
      IF old_len >= 5 AND new_len < ceil(old_len * 0.8) AND NOT allow_flag THEN
        RAISE EXCEPTION 'KFT_GUARD: refusing to shrink % from % to % users (possible incomplete device list)', NEW.key, old_len, new_len
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- 4b. Per-user rows (`kft_user_*`): Role escalation guard, Account takeover guard, and monotonic VIP/registration date
  IF NEW.key LIKE 'kft\_user\_%' ESCAPE '\' AND jsonb_typeof(NEW.payload) = 'object' THEN
    -- Verified Admin token is allowed to manage user rows
    IF v_admin_ok THEN
      RETURN NEW;
    END IF;

    -- [G3] Role Privilege Escalation Guard: unauthenticated callers can NEVER set role to 'admin' or 'owner'
    IF old_p IS NOT NULL AND jsonb_typeof(old_p) = 'object' THEN
      IF coalesce(NEW.payload->>'role', 'user') <> coalesce(old_p->>'role', 'user') THEN
        NEW.payload := jsonb_set(NEW.payload, '{role}', to_jsonb(coalesce(old_p->>'role', 'user')));
      END IF;
    ELSE
      IF coalesce(NEW.payload->>'role', 'user') <> 'user' THEN
        NEW.payload := jsonb_set(NEW.payload, '{role}', '"user"'::jsonb);
      END IF;
    END IF;

    IF old_p IS NOT NULL AND jsonb_typeof(old_p) = 'object' THEN
      -- [G2] Account Takeover Guard: immutable primary identity (email, googleSub, phone) & passwordHash protection
      IF coalesce(old_p->>'email', '') <> ''
         AND lower(coalesce(NEW.payload->>'email', '')) <> lower(old_p->>'email') THEN
        NEW.payload := jsonb_set(NEW.payload, '{email}', old_p->'email');
      END IF;

      IF coalesce(old_p->>'googleSub', '') <> ''
         AND coalesce(NEW.payload->>'googleSub', '') <> (old_p->>'googleSub') THEN
        NEW.payload := jsonb_set(NEW.payload, '{googleSub}', old_p->'googleSub');
      END IF;

      IF coalesce(old_p->>'phone', '') <> ''
         AND regexp_replace(coalesce(NEW.payload->>'phone', ''), '[^0-9]', '', 'g')
             <> regexp_replace(old_p->>'phone', '[^0-9]', '', 'g') THEN
        NEW.payload := jsonb_set(NEW.payload, '{phone}', old_p->'phone');
      END IF;

      IF coalesce(old_p->>'passwordHash', '') <> ''
         AND coalesce(NEW.payload->>'passwordHash', '') <> (old_p->>'passwordHash') THEN
        IF coalesce(v_prev_pw_hash, '') = '' OR v_prev_pw_hash <> (old_p->>'passwordHash') THEN
          NEW.payload := jsonb_set(NEW.payload, '{passwordHash}', old_p->'passwordHash');
        END IF;
      END IF;

      -- Monotonic VIP entitlement preservation
      old_exp := public.kft_try_ts(coalesce(old_p->>'subscriptionExpiryDate', old_p->>'vipExpiresAt'));
      old_active := coalesce(old_p->>'membershipTier', '') = 'premium_vip'
                AND coalesce(old_p->>'subscriptionStatus', '') <> 'cancelled'
                AND (old_p->>'vipCancelledAt') IS NULL
                AND old_exp IS NOT NULL AND old_exp > now();
      new_cancel := coalesce(NEW.payload->>'subscriptionStatus', '') = 'cancelled'
                 OR (NEW.payload->>'vipCancelledAt') IS NOT NULL;
      IF old_active AND NOT new_cancel THEN
        new_exp := public.kft_try_ts(coalesce(NEW.payload->>'subscriptionExpiryDate', NEW.payload->>'vipExpiresAt'));
        IF coalesce(NEW.payload->>'membershipTier', '') <> 'premium_vip' OR new_exp IS NULL OR new_exp < old_exp THEN
          NEW.payload := NEW.payload || jsonb_strip_nulls(jsonb_build_object(
            'membershipTier',           old_p->'membershipTier',
            'subscriptionStatus',       old_p->'subscriptionStatus',
            'vipStatus',                old_p->'vipStatus',
            'paymentStatus',            old_p->'paymentStatus',
            'subscriptionStartDate',    old_p->'subscriptionStartDate',
            'subscriptionExpiryDate',   old_p->'subscriptionExpiryDate',
            'vipExpiresAt',             old_p->'vipExpiresAt',
            'vipPlanDays',              old_p->'vipPlanDays',
            'vipPlanType',              old_p->'vipPlanType',
            'transactionRef',           old_p->'transactionRef',
            'paidAdditionalStoreSlots', old_p->'paidAdditionalStoreSlots'
          ));
        END IF;
      END IF;

      -- Registration date can only move EARLIER
      IF coalesce(old_p->>'createdAt', '') <> ''
         AND (coalesce(NEW.payload->>'createdAt', '') = '' OR (old_p->>'createdAt') < (NEW.payload->>'createdAt')) THEN
        NEW.payload := jsonb_set(NEW.payload, '{createdAt}', old_p->'createdAt');
      END IF;
      IF coalesce(old_p->>'registeredAtIso', '') <> ''
         AND (coalesce(NEW.payload->>'registeredAtIso', '') = '' OR (old_p->>'registeredAtIso') < (NEW.payload->>'registeredAtIso')) THEN
        NEW.payload := jsonb_set(NEW.payload, '{registeredAtIso}', old_p->'registeredAtIso');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS a_kft_kv_guard ON public.kft_app_kv_store;
CREATE TRIGGER a_kft_kv_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.kft_app_kv_store
  FOR EACH ROW EXECUTE FUNCTION public.kft_kv_guard();

-- 2. Harden Storage `food-media` Bucket Policies (block anonymous overwrite/delete & non-image uploads)
DROP POLICY IF EXISTS "Allow public read and upload on food-media" ON storage.objects;
DROP POLICY IF EXISTS "food_media_public_select" ON storage.objects;
DROP POLICY IF EXISTS "food_media_safe_image_insert" ON storage.objects;
DROP POLICY IF EXISTS "food_media_service_update" ON storage.objects;
DROP POLICY IF EXISTS "food_media_service_delete" ON storage.objects;

CREATE POLICY "food_media_public_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'food-media');

CREATE POLICY "food_media_safe_image_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'food-media'
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'avif')
    AND position('..' in name) = 0
  );

CREATE POLICY "food_media_service_update"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'food-media')
  WITH CHECK (bucket_id = 'food-media');

CREATE POLICY "food_media_service_delete"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'food-media');