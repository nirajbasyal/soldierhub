-- Allow admins to remove Board Prep user request rows from the admin inbox.
-- RLS still protects this action so only profiles.role = 'admin' can delete.

begin;

grant delete on public.board_question_requests to authenticated;

drop policy if exists board_question_requests_admin_delete on public.board_question_requests;

create policy board_question_requests_admin_delete
on public.board_question_requests
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

commit;
