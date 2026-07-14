revoke execute on function public.request_profile_rereview(text) from public, anon;
grant execute on function public.request_profile_rereview(text) to authenticated;
grant execute on function public.request_profile_rereview(text) to service_role;
comment on function public.request_profile_rereview(text) is 'RPC allowlist: authenticated/service_role only. Requires auth uid and only allows rejected or revoked profiles to return to pending review.';
