-- Several migrations maintained protect_profile_sensitive_fields(), but the
-- reproducible baseline never attached it to public.profiles. RLS limits an
-- owner to their own row; this trigger prevents that owner from changing
-- admin-controlled identity, role, and verification fields on the row.

begin;

drop trigger if exists profiles_protect_sensitive_fields on public.profiles;

create trigger profiles_protect_sensitive_fields
before update on public.profiles
for each row
execute function public.protect_profile_sensitive_fields();

commit;
