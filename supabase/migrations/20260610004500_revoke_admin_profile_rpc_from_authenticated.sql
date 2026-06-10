-- Restrict admin profile RPCs to service_role only.
-- Admin access must go through Next.js API routes protected by requireAdmin + MFA.

REVOKE EXECUTE ON FUNCTION public.admin_list_profiles(text, integer) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reject_profile(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_profile(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_verify_profile_by_email(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_profile_by_email(text) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_profiles(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_profile(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_profile(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_verify_profile_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_profile_by_email(text) TO service_role;
