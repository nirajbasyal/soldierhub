-- ============================================================================
-- Soldier Hub production cleanup: remove military_email from profiles
-- ============================================================================
-- Goal:
--   Stop collecting and storing military email addresses.
--
-- What this migration does:
--   1. Replaces the signup trigger function so new users no longer write
--      military_email into public.profiles.
--   2. Replaces the profile sensitive-field protection trigger function so it
--      no longer references the removed column.
--   3. Replaces request_profile_rereview so re-review only accepts optional
--      phone number.
--   4. Drops public.profiles.military_email from the database.
-- ============================================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    personal_email,
    full_name,
    phone,
    bio,
    avatar_color,
    base,
    role,
    status,
    verification_status,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(coalesce(new.email, '')),
    lower(coalesce(new.raw_user_meta_data ->> 'personal_email', new.email, '')),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'SoldierHub Member'
    ),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    coalesce(new.raw_user_meta_data ->> 'bio', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'avatar_color', ''), '#314A66'),
    'Fort Bliss',
    'user',
    'pending',
    'pending',
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    personal_email = excluded.personal_email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    bio = excluded.bio,
    avatar_color = excluded.avatar_color,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admins can manage verification/admin fields.
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

  if new.status is distinct from old.status then
    raise exception 'Account status cannot be changed from profile settings.';
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

drop function if exists public.request_profile_rereview(text, text);
drop function if exists public.request_profile_rereview(text);

create function public.request_profile_rereview(p_phone text default null::text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to request re-review.';
  end if;

  update public.profiles
  set
    status = 'pending',
    verification_status = 'pending',
    phone = coalesce(nullif(p_phone, ''), phone)
  where id = auth.uid()
    and status in ('rejected', 'revoked');
end;
$$;

alter table public.profiles
  drop column if exists military_email;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role;

grant execute on function public.request_profile_rereview(text) to authenticated;

commit;
-- Canonical 14-digit migration version; normalized during history reconciliation.
