create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Admin API routes use the service_role key after requireAdmin + MFA.
  -- Allow that server-side path to manage moderation fields.
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return new;
  end if;

  -- Signed-in admins using an authenticated JWT can manage verification/admin fields.
  if public.is_admin() then
    return new;
  end if;

  -- Normal users cannot change identity, verification, or admin-controlled fields.
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

revoke execute on function public.protect_profile_sensitive_fields() from public, anon, authenticated;
grant execute on function public.protect_profile_sensitive_fields() to service_role;
