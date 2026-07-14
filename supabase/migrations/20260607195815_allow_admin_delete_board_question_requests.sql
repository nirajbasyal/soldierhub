begin;

grant delete on public.board_question_requests to authenticated;

-- Keep row-level protection explicit: only admins can remove request rows.
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
