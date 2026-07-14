grant execute on function public.admin_list_profiles(text, integer) to authenticated;
grant execute on function public.admin_reject_profile(uuid) to authenticated;
grant execute on function public.admin_revoke_profile(uuid) to authenticated;
grant execute on function public.admin_verify_profile_by_email(text) to authenticated;
grant execute on function public.admin_revoke_profile_by_email(text) to authenticated;
