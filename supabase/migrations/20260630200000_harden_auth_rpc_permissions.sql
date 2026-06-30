-- Tighten auth-adjacent RPC permissions.
-- This keeps public read/feed RPC behavior unchanged, but removes anonymous access
-- from the re-review workflow because it requires a signed-in user.

begin;

revoke execute on function public.request_profile_rereview(text) from public, anon;
grant execute on function public.request_profile_rereview(text) to authenticated;
grant execute on function public.request_profile_rereview(text) to service_role;

comment on function public.request_profile_rereview(text) is 'RPC allowlist: authenticated/service_role only. Requires auth.uid() and only allows rejected/revoked profiles to return to pending review.';

commit;
