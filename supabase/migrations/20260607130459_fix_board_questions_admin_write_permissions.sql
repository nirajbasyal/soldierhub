begin;

alter table public.board_questions enable row level security;

-- Allow the authenticated PostgREST role to attempt admin writes.
-- Row-level security below still limits actual write access to admin profiles only.
grant select, insert, update, delete on public.board_questions to authenticated;

-- Keep public members able to read active questions, while admins can manage all questions.
drop policy if exists board_questions_select_active_or_admin on public.board_questions;
drop policy if exists board_questions_admin_insert on public.board_questions;
drop policy if exists board_questions_admin_update on public.board_questions;
drop policy if exists board_questions_admin_delete on public.board_questions;

drop policy if exists board_questions_read_active_or_admin on public.board_questions;
drop policy if exists board_questions_admin_manage on public.board_questions;

create policy board_questions_select_active_or_admin
on public.board_questions
for select
to authenticated
using (
  (active = true and deleted_at is null)
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

create policy board_questions_admin_insert
on public.board_questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

create policy board_questions_admin_update
on public.board_questions
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

create policy board_questions_admin_delete
on public.board_questions
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

notify pgrst, 'reload schema';

commit;
