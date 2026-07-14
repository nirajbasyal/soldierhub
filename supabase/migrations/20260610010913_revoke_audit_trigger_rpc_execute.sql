revoke execute on function public.tg_audit_profile_status_changes() from public, anon, authenticated;
grant execute on function public.tg_audit_profile_status_changes() to service_role;

comment on function public.tg_audit_profile_status_changes() is 'Internal trigger function only. Direct RPC execute revoked from public, anon, and authenticated roles.';
