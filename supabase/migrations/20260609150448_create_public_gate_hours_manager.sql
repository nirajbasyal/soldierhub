begin;

create table if not exists public.gates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  label text not null default 'Access Gate',
  note text not null default '',
  hours text not null default '24/7',
  status_type text not null default 'always' check (status_type in ('always', 'weekday-limited', 'closed', 'custom')),
  open_time time,
  close_time time,
  days text[] not null default array[]::text[],
  custom_status_text text,
  custom_is_open boolean,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gates_name_not_blank check (length(trim(name)) > 0),
  constraint gates_hours_not_blank check (length(trim(hours)) > 0)
);

create index if not exists gates_public_order_idx on public.gates (is_active, display_order, name);

alter table public.gates enable row level security;

drop policy if exists "Public can read active gate hours" on public.gates;
create policy "Public can read active gate hours"
on public.gates
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins can insert gates" on public.gates;
create policy "Admins can insert gates"
on public.gates
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update gates" on public.gates;
create policy "Admins can update gates"
on public.gates
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete gates" on public.gates;
create policy "Admins can delete gates"
on public.gates
for delete
to authenticated
using (public.is_admin());

drop trigger if exists gates_set_updated_at on public.gates;
create trigger gates_set_updated_at
before update on public.gates
for each row execute function public.tg_set_updated_at();

grant select on public.gates to anon, authenticated;
grant insert, update, delete on public.gates to authenticated;

insert into public.gates (name, label, hours, status_type, open_time, close_time, days, note, is_active, display_order)
values
  ('MSG Pena Gate', 'Main Gate', '24/7', 'always', null, null, array[]::text[], 'Primary access gate.', true, 10),
  ('Buffalo Soldier Gate', 'Visitor Center', '24/7', 'always', null, null, array[]::text[], 'Visitor access and gate passes may be handled here.', true, 20),
  ('Cassidy Gate', 'Access Gate', '24/7', 'always', null, null, array[]::text[], 'Open daily.', true, 30),
  ('Constitution Gate', 'Access Gate', '24/7', 'always', null, null, array[]::text[], 'Open daily.', true, 40),
  ('Old Ironsides Gate', 'Weekday Gate', 'Mon-Fri · 5 AM-9 PM', 'weekday-limited', '05:00', '21:00', array['Monday','Tuesday','Wednesday','Thursday','Friday'], 'Closed Saturday, Sunday, and national holidays.', true, 50)
on conflict (id) do nothing;

commit;
