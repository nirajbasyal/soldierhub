-- Several migrations maintained protect_profile_sensitive_fields(), but the
-- reproducible baseline never attached it to public.profiles. RLS limits an
-- owner to their own row; this trigger prevents that owner from changing
-- admin-controlled identity, role, and verification fields on the row.

begin;

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
begin
  -- Support both legacy PostgREST per-claim settings and the current JSON
  -- claims setting. Only the server-held service key can reach this branch.
  if jwt_role = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  -- The explicit re-review workflow may move the signed-in owner's rejected
  -- or revoked profile back to pending and update the phone at the same time.
  if auth.uid() = old.id
    and new.id is not distinct from old.id
    and new.email is not distinct from old.email
    and new.personal_email is not distinct from old.personal_email
    and new.role is not distinct from old.role
    and new.created_at is not distinct from old.created_at
    and old.verification_status in ('rejected', 'revoked')
    and new.verification_status = 'pending'
  then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile ID cannot be changed.';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Email cannot be changed from profile settings.';
  end if;

  if new.personal_email is distinct from old.personal_email then
    raise exception 'Personal email cannot be changed from profile settings.';
  end if;

  if new.phone is distinct from old.phone then
    raise exception 'Phone number cannot be changed from profile settings.';
  end if;

  if new.role is distinct from old.role then
    raise exception 'Role cannot be changed from profile settings.';
  end if;

  if new.verification_status is distinct from old.verification_status then
    raise exception 'Verification status cannot be changed from profile settings.';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'Created date cannot be changed.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_sensitive_fields on public.profiles;

create trigger profiles_protect_sensitive_fields
before update on public.profiles
for each row
execute function public.protect_profile_sensitive_fields();

commit;
