-- SoldierHub fix: match current RPC function signatures used by live schema.
-- Safe to run more than once.

begin;

do $$
begin
  if to_regprocedure(
    'public.get_public_posts(integer,timestamp with time zone,uuid)'
  ) is not null then
    revoke all on function public.get_public_posts(
      integer,
      timestamp with time zone,
      uuid
    ) from public;
    grant execute on function public.get_public_posts(
      integer,
      timestamp with time zone,
      uuid
    ) to anon, authenticated;
  end if;

  if to_regprocedure(
    'public.create_visitor_report(uuid,text,text)'
  ) is not null then
    revoke all on function public.create_visitor_report(uuid, text, text)
      from public;
    grant execute on function public.create_visitor_report(uuid, text, text)
      to anon, authenticated;
  end if;

  if to_regprocedure('public.restore_reported_post(uuid)') is not null then
    revoke all on function public.restore_reported_post(uuid) from public;
    grant execute on function public.restore_reported_post(uuid)
      to authenticated;
  end if;
end;
$$;

commit;
-- Canonical 14-digit migration version; normalized during history reconciliation.
