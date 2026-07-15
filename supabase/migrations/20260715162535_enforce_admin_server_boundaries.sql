-- Move database-level administrator privileges behind the server boundary.
-- The application routes require the configured admin-email allowlist and a
-- real AAL2 session before using the service-role client.

begin;

-- Reassert the two release-candidate changes before tightening admin access.
-- This makes the latest migration a safe reconciliation point for a remote
-- project whose tracking history stopped at 20260714144013.
grant select, update on table public.profiles to service_role;
grant select, insert, update, delete on table public.posts to service_role;
grant select, insert, update, delete on table public.comments to service_role;

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if jwt_role = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

comment on function public.is_admin() is
  'Server authorization helper. Browser JWTs are never database administrators; protected API routes enforce the configured email allowlist and AAL2 before using service_role.';

-- Replace historical inline role checks with the server-only helper. This
-- closes direct Data API bypasses for every admin-managed table, including an
-- AAL2 browser token belonging to a profile whose role is admin.
drop policy if exists board_memory_items_admin_select_all on public.board_memory_items;
drop policy if exists board_memory_items_authenticated_select_active on public.board_memory_items;
drop policy if exists board_memory_items_admin_update on public.board_memory_items;

create policy board_memory_items_authenticated_select
on public.board_memory_items
for select
to authenticated
using (active = true or (select public.is_admin()));

create policy board_memory_items_admin_update
on public.board_memory_items
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists board_question_requests_own_or_admin_select
  on public.board_question_requests;
drop policy if exists board_question_requests_admin_update
  on public.board_question_requests;
drop policy if exists board_question_requests_admin_delete
  on public.board_question_requests;

create policy board_question_requests_own_or_admin_select
on public.board_question_requests
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy board_question_requests_admin_update
on public.board_question_requests
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy board_question_requests_admin_delete
on public.board_question_requests
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists board_questions_select_active_or_admin on public.board_questions;
drop policy if exists board_questions_admin_insert on public.board_questions;
drop policy if exists board_questions_admin_update on public.board_questions;
drop policy if exists board_questions_admin_delete on public.board_questions;

create policy board_questions_select_active_or_admin
on public.board_questions
for select
to authenticated
using ((active = true and deleted_at is null) or (select public.is_admin()));

create policy board_questions_admin_insert
on public.board_questions
for insert
to authenticated
with check ((select public.is_admin()));

create policy board_questions_admin_update
on public.board_questions
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy board_questions_admin_delete
on public.board_questions
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can add resources" on public.resources;
drop policy if exists "Admins can update resources" on public.resources;
drop policy if exists "Admins can delete resources" on public.resources;

create policy "Admins can add resources"
on public.resources
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can update resources"
on public.resources
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete resources"
on public.resources
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read all gate hours" on public.gates;
drop policy if exists "Anyone can read active gate hours" on public.gates;

create policy gates_anon_select_active
on public.gates
for select
to anon
using (is_active = true);

create policy gates_authenticated_select_active_or_admin
on public.gates
for select
to authenticated
using (is_active = true or (select public.is_admin()));

-- Defense in depth: authenticated members retain the reads/inserts their
-- product flows need, but cannot invoke admin-only table mutations at all.
revoke update on table public.board_memory_items from authenticated;
revoke update, delete on table public.board_question_requests from authenticated;
revoke insert, update, delete on table public.board_questions from authenticated;
revoke insert, update, delete on table public.resources from authenticated;
revoke insert, update, delete on table public.gates from authenticated;
revoke select on table public.profile_status_audit_log from authenticated;

-- The pending queue needs to check auth.users.email_confirmed_at, so this
-- remains SECURITY DEFINER. Only the service-role client held by the protected
-- server route may execute it.
create or replace function public.admin_list_profiles(
  p_queue text default 'pending'::text,
  p_limit integer default 50
)
returns table(
  id uuid,
  full_name text,
  email text,
  personal_email text,
  phone text,
  bio text,
  avatar_color text,
  avatar_url text,
  role text,
  status text,
  verification_status text,
  base text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_queue text := lower(trim(coalesce(p_queue, 'pending')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Admin profile queues are available only through the protected server route.';
  end if;

  if v_queue not in ('pending', 'verified', 'blocked') then
    raise exception 'Invalid admin profile queue.';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.personal_email,
    p.phone,
    p.bio,
    p.avatar_color,
    p.avatar_url,
    p.role,
    p.verification_status as status,
    p.verification_status,
    p.base,
    p.created_at,
    p.updated_at
  from public.profiles p
  left join auth.users au on au.id = p.id
  where
    (
      v_queue = 'pending'
      and p.verification_status = 'pending'
      and au.email_confirmed_at is not null
    )
    or (v_queue = 'verified' and p.verification_status = 'verified')
    or (v_queue = 'blocked' and p.verification_status in ('rejected', 'revoked'))
  order by p.created_at desc, p.id desc
  limit v_limit;
end;
$$;

revoke execute on function public.admin_list_profiles(text, integer)
from public, anon, authenticated;
revoke execute on function public.admin_reject_profile(uuid)
from public, anon, authenticated;
revoke execute on function public.admin_revoke_profile(uuid)
from public, anon, authenticated;
revoke execute on function public.admin_verify_profile_by_email(text)
from public, anon, authenticated;
revoke execute on function public.admin_revoke_profile_by_email(text)
from public, anon, authenticated;
revoke execute on function public.restore_reported_post(uuid)
from public, anon, authenticated;

grant execute on function public.admin_list_profiles(text, integer) to service_role;
grant execute on function public.admin_reject_profile(uuid) to service_role;
grant execute on function public.admin_revoke_profile(uuid) to service_role;
grant execute on function public.admin_verify_profile_by_email(text) to service_role;
grant execute on function public.admin_revoke_profile_by_email(text) to service_role;
grant execute on function public.restore_reported_post(uuid) to service_role;

comment on function public.restore_reported_post(uuid) is
  'Server-only moderation action. The protected admin route enforces role, configured email, AAL2, and rate limits.';

commit;
