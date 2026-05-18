-- SoldierHub fix: match current RPC function signatures used by live schema.
-- Safe to run more than once.

begin;

revoke all on function public.get_public_posts(integer, timestamp with time zone, uuid) from public;
revoke all on function public.create_visitor_report(uuid, text, text) from public;
revoke all on function public.restore_reported_post(uuid) from public;

grant execute on function public.get_public_posts(integer, timestamp with time zone, uuid) to anon, authenticated;
grant execute on function public.create_visitor_report(uuid, text, text) to anon, authenticated;
grant execute on function public.restore_reported_post(uuid) to authenticated;

commit;
