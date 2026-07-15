-- Protected Next.js routes use service_role only after authenticating the
-- caller and enforcing verification, rate limits, moderation, and ownership.
-- A clean rebuild previously granted these tables only to authenticated, so
-- the server-only write path failed despite service_role bypassing RLS.

begin;

grant select, update on table public.profiles to service_role;
grant select, insert, update, delete on table public.posts to service_role;
grant select, insert, update, delete on table public.comments to service_role;

comment on table public.profiles is
  'Private member profiles. Browser access is RLS-restricted; trusted server routes use service_role for verified profile and admin workflows.';

commit;
