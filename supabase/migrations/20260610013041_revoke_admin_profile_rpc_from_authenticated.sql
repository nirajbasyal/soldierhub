revoke execute on function public.admin_list_profiles(text, integer) from public, anon, authenticated;
revoke execute on function public.admin_reject_profile(uuid) from public, anon, authenticated;
revoke execute on function public.admin_revoke_profile(uuid) from public, anon, authenticated;
revoke execute on function public.admin_verify_profile_by_email(text) from public, anon, authenticated;
revoke execute on function public.admin_revoke_profile_by_email(text) from public, anon, authenticated;

grant execute on function public.admin_list_profiles(text, integer) to service_role;
grant execute on function public.admin_reject_profile(uuid) to service_role;
grant execute on function public.admin_revoke_profile(uuid) to service_role;
grant execute on function public.admin_verify_profile_by_email(text) to service_role;
grant execute on function public.admin_revoke_profile_by_email(text) to service_role;
