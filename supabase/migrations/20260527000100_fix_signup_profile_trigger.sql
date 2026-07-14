-- ============================================================================
-- Soldier Hub hotfix: ensure account signup creates a pending profile
-- ============================================================================
-- Problem:
--   Supabase Auth can create a user, but the app requires a matching row in
--   public.profiles. If the auth.users trigger is missing or stale, signup/login
--   can appear broken because the app cannot find the new user's profile.
--
-- Fix:
--   Recreate public.handle_new_user() and the auth.users AFTER INSERT trigger.
--   This keeps Auth and public.profiles synchronized for new signups.
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
    military_email,
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
    nullif(lower(trim(new.raw_user_meta_data ->> 'military_email')), ''),
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
    military_email = excluded.military_email,
    phone = excluded.phone,
    bio = excluded.bio,
    avatar_color = excluded.avatar_color,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role;

commit;
-- Canonical 14-digit migration version; normalized during history reconciliation.
