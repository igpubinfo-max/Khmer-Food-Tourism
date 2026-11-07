-- HOTFIX 2: make the archive trigger work for the API roles + clean up test rows. Safe to re-run.
-- A) run the trigger function as the table owner (bypasses RLS on kft_app_kv_history)
ALTER FUNCTION public.kft_kv_archive() SECURITY DEFINER;
ALTER FUNCTION public.kft_kv_archive() SET search_path = public;
ALTER FUNCTION public.kft_kv_archive() OWNER TO postgres;

-- B) belt-and-braces: append-only INSERT policy (NO select/update/delete => history stays unreadable through the API)
DROP POLICY IF EXISTS kft_history_insert_only ON public.kft_app_kv_history;
CREATE POLICY kft_history_insert_only ON public.kft_app_kv_history
  FOR INSERT TO anon, authenticated WITH CHECK (true);
GRANT INSERT ON public.kft_app_kv_history TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.kft_app_kv_history_id_seq TO anon, authenticated;

-- C) remove throwaway test rows (SQL editor = no API headers = allowed by the guard)
DELETE FROM public.kft_app_kv_store WHERE key LIKE 'kft\_user\_zz\_guardtest%' ESCAPE '\';

-- D) diagnostics: send me this result table
SELECT p.proname,
       p.prosecdef                       AS security_definer,
       pg_get_userbyid(p.proowner)       AS owner,
       (SELECT rolbypassrls FROM pg_roles WHERE rolname = pg_get_userbyid(p.proowner)) AS owner_bypasses_rls,
       (SELECT count(*) FROM pg_trigger t WHERE t.tgrelid = 'public.kft_app_kv_store'::regclass AND NOT t.tgisinternal) AS triggers_on_store,
       (SELECT count(*) FROM public.kft_app_kv_store WHERE key LIKE 'kft\_user\_zz\_guardtest%' ESCAPE '\') AS leftover_test_rows
FROM pg_proc p
WHERE p.proname IN ('kft_kv_archive', 'kft_kv_guard');