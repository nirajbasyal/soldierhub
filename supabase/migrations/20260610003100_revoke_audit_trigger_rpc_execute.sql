-- Prevent direct RPC execution of the internal audit trigger function.
-- Trigger execution still works; public/anon/authenticated users cannot call it directly.

REVOKE EXECUTE ON FUNCTION public.tg_audit_profile_status_changes() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_audit_profile_status_changes() TO service_role;

COMMENT ON FUNCTION public.tg_audit_profile_status_changes() IS 'Internal trigger function only. Direct RPC execute revoked from public, anon, and authenticated roles.';
