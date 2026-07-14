create table if not exists public.profile_status_audit_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  old_verification_status text,
  new_verification_status text,
  old_role text,
  new_role text,
  changed_at timestamptz not null default now()
);

alter table public.profile_status_audit_log enable row level security;

create index if not exists profile_status_audit_log_profile_changed_idx
  on public.profile_status_audit_log (profile_id, changed_at desc);

create index if not exists profile_status_audit_log_actor_changed_idx
  on public.profile_status_audit_log (actor_id, changed_at desc);

create index if not exists profile_status_audit_log_changed_idx
  on public.profile_status_audit_log (changed_at desc);

create or replace function public.tg_audit_profile_status_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and (
       new.verification_status is distinct from old.verification_status
       or new.role is distinct from old.role
     ) then
    insert into public.profile_status_audit_log (
      profile_id,
      actor_id,
      old_verification_status,
      new_verification_status,
      old_role,
      new_role
    ) values (
      new.id,
      auth.uid(),
      old.verification_status,
      new.verification_status,
      old.role,
      new.role
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_profile_status_changes on public.profiles;

create trigger audit_profile_status_changes
after update of verification_status, role on public.profiles
for each row
execute function public.tg_audit_profile_status_changes();

create policy "profile_status_audit_log_admin_select"
  on public.profile_status_audit_log
  for select
  to authenticated
  using ((select public.is_admin()));

revoke all on public.profile_status_audit_log from anon, authenticated;
grant select on public.profile_status_audit_log to authenticated;
grant all on public.profile_status_audit_log to service_role;

comment on table public.profile_status_audit_log is 'Audit trail for profile verification status and role changes.';
