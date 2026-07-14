drop trigger if exists trg_sync_profile_verification_status on public.profiles;

create trigger trg_sync_profile_verification_status
before insert or update on public.profiles
for each row
execute function public.sync_profile_verification_status();
