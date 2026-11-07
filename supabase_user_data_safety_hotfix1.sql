-- ============================================================================
-- HOTFIX 1 (run once): archive trigger must run with owner rights, otherwise the anon
-- key cannot insert into kft_app_kv_history (RLS) and EVERY edit/delete of a protected
-- user row fails with HTTP 401.  Safe to re-run.
-- ============================================================================
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

-- Remove the throwaway test rows created by the live guard test (SQL editor = no API headers = allowed)
DELETE FROM public.kft_app_kv_store WHERE key LIKE 'kft\_user\_zz\_guardtest%' ESCAPE '\';

SELECT 'hotfix applied' AS status,
       (SELECT prosecdef FROM pg_proc WHERE proname = 'kft_kv_archive') AS archive_is_security_definer,
       (SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft\_user\_zz\_guardtest%' ESCAPE '\') AS leftover_test_rows;