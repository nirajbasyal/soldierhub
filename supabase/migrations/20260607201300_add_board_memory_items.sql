begin;

create table if not exists public.board_memory_items (
  id uuid primary key default gen_random_uuid(),
  memory_key text not null unique,
  title text not null,
  summary text not null default '',
  body text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_memory_items enable row level security;

grant select on public.board_memory_items to authenticated;
grant update on public.board_memory_items to authenticated;

-- Authenticated users can read active memory guide items.
drop policy if exists board_memory_items_authenticated_select_active on public.board_memory_items;
create policy board_memory_items_authenticated_select_active
on public.board_memory_items
for select
to authenticated
using (active = true);

-- Admins can read every memory guide item, including inactive draft items.
drop policy if exists board_memory_items_admin_select_all on public.board_memory_items;
create policy board_memory_items_admin_select_all
on public.board_memory_items
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

-- Admins can edit title, summary, body, order, and active status.
drop policy if exists board_memory_items_admin_update on public.board_memory_items;
create policy board_memory_items_admin_update
on public.board_memory_items
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

insert into public.board_memory_items (memory_key, title, summary, body, display_order, active)
values
  (
    'soldiers-creed',
    'Soldier''s Creed',
    'Opening, Warrior Ethos, Army Values, readiness.',
    'Study the full Soldier''s Creed from your board packet. Know the opening, Warrior Ethos, Army Values, readiness, professionalism, and the final line.',
    10,
    true
  ),
  (
    'nco-creed',
    'NCO Creed',
    'Professionalism, competence, mission, Soldiers.',
    'Study the full Creed of the Noncommissioned Officer. Know the opening, the watchword, the two basic responsibilities, and the closing identity of NCOs as professionals and leaders.',
    20,
    true
  ),
  (
    'army-song',
    'Army Song',
    'Official title and confidence cue.',
    'Official title: The Army Goes Rolling Along. Practice the intro, verse, and refrain from your official board packet.',
    30,
    true
  ),
  (
    'general-orders',
    'General Orders',
    'Three common board questions.',
    '1. Guard everything within the limits of my post and quit my post only when properly relieved.

2. Obey my special orders and perform all my duties in a military manner.

3. Report violations of my special orders, emergencies, and anything not covered in my instructions to the commander of the relief.',
    40,
    true
  )
on conflict (memory_key) do update
set
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  display_order = excluded.display_order,
  active = excluded.active,
  updated_at = now();

commit;
