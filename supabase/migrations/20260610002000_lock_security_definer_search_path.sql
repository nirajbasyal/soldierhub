-- Lock search_path for all public SECURITY DEFINER functions.
-- Purpose: prevent search_path hijacking risks while preserving current RPC permissions.
-- Safe: does not change function logic, grants, or table data.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      r.schema_name,
      r.function_name,
      r.identity_arguments
    );
  END LOOP;
END $$;
