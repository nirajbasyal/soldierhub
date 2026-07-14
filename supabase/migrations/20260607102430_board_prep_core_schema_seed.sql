begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.board_questions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null default 'General',
  source_publication text,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('a', 'b', 'c', 'd')),
  explanation text,
  difficulty text not null default 'basic' check (difficulty in ('basic', 'medium', 'hard')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.board_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  question_ids uuid[] not null default '{}',
  answers jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  score integer check (score is null or (score >= 0 and score <= 5)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_date)
);

create table if not exists public.board_question_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('add', 'update', 'remove')),
  question_id uuid references public.board_questions(id) on delete set null,
  category text,
  message text not null,
  suggested_question text,
  suggested_answer text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_board_questions_active_category
  on public.board_questions (active, category, updated_at desc)
  where deleted_at is null;

create index if not exists idx_board_sessions_user_date
  on public.board_sessions (user_id, session_date desc);

create index if not exists idx_board_question_requests_status_created
  on public.board_question_requests (status, created_at desc);

create or replace function public.tg_set_board_prep_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists board_questions_set_updated_at on public.board_questions;
create trigger board_questions_set_updated_at
before update on public.board_questions
for each row execute function public.tg_set_board_prep_updated_at();

drop trigger if exists board_sessions_set_updated_at on public.board_sessions;
create trigger board_sessions_set_updated_at
before update on public.board_sessions
for each row execute function public.tg_set_board_prep_updated_at();

alter table public.board_questions enable row level security;
alter table public.board_sessions enable row level security;
alter table public.board_question_requests enable row level security;

-- board_questions policies
drop policy if exists board_questions_read_active_or_admin on public.board_questions;
drop policy if exists board_questions_select_active_or_admin on public.board_questions;
drop policy if exists board_questions_admin_insert on public.board_questions;
drop policy if exists board_questions_admin_update on public.board_questions;
drop policy if exists board_questions_admin_delete on public.board_questions;

create policy board_questions_select_active_or_admin
on public.board_questions
for select
to authenticated
using (
  (active = true and deleted_at is null)
  or exists (
    select 1 from public.profiles p
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
    select 1 from public.profiles p
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
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
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
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

-- board_sessions policies
drop policy if exists board_sessions_own_select on public.board_sessions;
drop policy if exists board_sessions_own_insert on public.board_sessions;
drop policy if exists board_sessions_own_update on public.board_sessions;

create policy board_sessions_own_select
on public.board_sessions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy board_sessions_own_insert
on public.board_sessions
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy board_sessions_own_update
on public.board_sessions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- board_question_requests policies
drop policy if exists board_question_requests_own_or_admin_select on public.board_question_requests;
drop policy if exists board_question_requests_own_insert on public.board_question_requests;
drop policy if exists board_question_requests_admin_update on public.board_question_requests;

create policy board_question_requests_own_or_admin_select
on public.board_question_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

create policy board_question_requests_own_insert
on public.board_question_requests
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy board_question_requests_admin_update
on public.board_question_requests
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

-- Grants for PostgREST authenticated access. RLS still controls rows.
grant select on public.board_questions to authenticated;
grant select, insert, update on public.board_sessions to authenticated;
grant select, insert, update on public.board_question_requests to authenticated;

insert into public.board_questions
(slug, category, source_publication, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, active)
values
('reg-army-leadership-adp-6-22','Regulation ID','ADP 6-22','Which publication covers Army Leadership?','ADP 6-22','AR 670-1','TC 3-25.26','AR 27-10','a','ADP 6-22 covers Army Leadership and the Profession.','basic',true),
('reg-mission-command-adp-6-0','Regulation ID','ADP 6-0','Which publication covers Mission Command?','AR 600-20','ADP 6-0','FM 7-22','AR 600-8-22','b','ADP 6-0 covers Mission Command: Command and Control of Army Forces.','basic',true),
('reg-wear-appearance-ar-670-1','Regulation ID','AR 670-1 / DA PAM 670-1','What regulation covers wear and appearance of Army uniforms?','AR 600-9','AR 350-1','AR 670-1','AR 600-8-2','c','AR 670-1 covers wear and appearance. DA PAM 670-1 gives detailed how-to guidance.','basic',true),
('reg-promotions-ar-600-8-19','Regulation ID','AR 600-8-19','What regulation covers enlisted promotions and reductions?','AR 600-8-19','AR 623-3','AR 27-10','TC 7-22.7','a','AR 600-8-19 governs enlisted promotions and reductions.','basic',true),
('reg-flags-ar-600-8-2','Regulation ID','AR 600-8-2','What regulation covers suspension of favorable actions, also called flags?','AR 600-8-2','AR 600-8-22','AR 750-1','FM 3-11','a','AR 600-8-2 covers flags. DA Form 268 is used.','basic',true),
('reg-awards-ar-600-8-22','Regulation ID','AR 600-8-22','What regulation covers military awards?','AR 27-10','AR 600-8-22','ADP 7-0','TC 3-21.5','b','AR 600-8-22 covers military awards.','basic',true),
('reg-evaluations-ar-623-3','Regulation ID','AR 623-3 / DA PAM 623-3','What regulation covers NCOERs and OERs?','AR 623-3','AR 600-25','FM 7-22','AR 600-8-2','a','AR 623-3 covers the Evaluation Reporting System.','basic',true),
('reg-command-policy-ar-600-20','Regulation ID','AR 600-20','What regulation covers Army Command Policy, EO, and SHARP?','AR 600-20','AR 27-10','AR 670-1','AR 600-9','a','AR 600-20 covers command policy, EO, SHARP, and the NCO support channel.','basic',true),
('reg-body-composition-ar-600-9','Regulation ID','AR 600-9','What regulation covers the Army Body Composition Program?','FM 7-22','AR 600-9','ADP 3-0','TC 4-02.1','b','AR 600-9 covers ABCP.','basic',true),
('reg-customs-courtesies-ar-600-25','Regulation ID','AR 600-25','What regulation covers salutes, honors, and visits of courtesy?','AR 600-25','AR 750-1','AR 350-1','FM 3-11','a','AR 600-25 covers salutes, honors, and visits of courtesy.','basic',true),
('reg-military-justice-ar-27-10','Regulation ID','AR 27-10','What regulation covers military justice and Article 15 administration?','AR 27-10','AR 623-3','TC 3-22.9','FM 7-22','a','AR 27-10 covers military justice. Article 15 is nonjudicial punishment under the UCMJ.','basic',true),
('reg-counseling-atp-6-22-1','Regulation ID','ATP 6-22.1','What publication covers the Army counseling process?','ATP 6-22.1','ADP 3-0','AR 600-8-19','TC 4-02.3','a','ATP 6-22.1 covers the Counseling Process.','basic',true),
('reg-nco-guide-tc-7-22-7','Regulation ID','TC 7-22.7','What publication covers NCO duties, responsibilities, and NCO history?','TC 7-22.7','AR 670-1','FM 3-11','AR 600-9','a','TC 7-22.7 is the NCO Guide.','basic',true),
('reg-h2f-fm-7-22','Regulation ID','FM 7-22','What manual covers Holistic Health and Fitness?','FM 7-22','AR 600-20','ADP 1','AR 600-8-22','a','FM 7-22 covers Holistic Health and Fitness.','basic',true),
('reg-drill-tc-3-21-5','Regulation ID','TC 3-21.5','What publication covers drill and ceremonies?','TC 3-21.5','TC 3-25.26','AR 623-3','FM 6-27','a','TC 3-21.5 covers drill and ceremonies.','basic',true),
('reg-land-nav-tc-3-25-26','Regulation ID','TC 3-25.26','What publication covers map reading and land navigation?','TC 3-25.26','TC 3-21.5','AR 350-1','FM 6-27','a','TC 3-25.26 covers map reading and land navigation.','basic',true),
('reg-cbrn-fm-3-11','Regulation ID','FM 3-11','What manual covers CBRN operations?','FM 3-11','FM 7-22','AR 27-10','TC 4-02.1','a','FM 3-11 covers Chemical, Biological, Radiological, and Nuclear Operations.','basic',true),
('reg-law-land-warfare-fm-6-27','Regulation ID','FM 6-27','What manual covers the law of land warfare?','FM 27-10','FM 6-27','AR 600-25','ADP 7-0','b','FM 6-27 replaced the older FM 27-10.','basic',true),
('leadership-definition','Leadership','ADP 6-22','What is Army leadership?','Influencing people by purpose, direction, and motivation','Following orders only','Maintaining equipment only','Writing counseling forms','a','Army leadership is influencing people by providing purpose, direction, and motivation to accomplish the mission and improve the organization.','basic',true),
('leadership-three-attributes','Leadership','ADP 6-22','What are the three leader attributes?','Character, presence, intellect','Leads, develops, achieves','Loyalty, duty, respect','Direct, organizational, strategic','a','Attributes describe what a leader is: character, presence, and intellect.','basic',true),
('leadership-three-competencies','Leadership','ADP 6-22','What are the three leader competencies?','Character, presence, intellect','Leads, develops, achieves','Plan, prepare, execute','Shoot, move, communicate','b','Competencies describe what a leader does: leads, develops, and achieves.','basic',true),
('mission-command-seven-principles','Mission Command','ADP 6-0','How many principles of mission command are there?','Five','Six','Seven','Eight','c','The seven principles are competence, mutual trust, shared understanding, commander intent, mission orders, disciplined initiative, and risk acceptance.','basic',true),
('mission-command-disciplined-initiative','Mission Command','ADP 6-0','What is disciplined initiative?','Acting within commander intent when orders no longer fit','Waiting for perfect instructions','Ignoring the chain of command','Avoiding all risk','a','Disciplined initiative means taking action consistent with commander intent when conditions change.','basic',true),
('warfighting-functions-six','Operations','ADP 3-0','Which answer lists the six warfighting functions?','Leadership, information, training, morale, discipline, readiness','Command and control, movement and maneuver, intelligence, fires, sustainment, protection','Shoot, move, communicate, survive, attack, defend','Offense, defense, stability, DSCA, command, fires','b','The six warfighting functions are command and control, movement and maneuver, intelligence, fires, sustainment, and protection.','basic',true),
('operations-tenets-fm-3-0','Operations','FM 3-0','What are the current FM 3-0 tenets of operations?','Agility, convergence, endurance, depth','Loyalty, duty, respect, honor','Crawl, walk, run, sustain','Plan, prepare, execute, assess','a','FM 3-0 uses agility, convergence, endurance, and depth as the tenets of operations.','basic',true),
('aftp-five-events','AFT / H2F','FM 7-22 / AFT','How many events are in the Army Fitness Test?','Four','Five','Six','Seven','b','The AFT has five events. The standing power throw was removed from the old ACFT format.','basic',true),
('aftp-removed-event','AFT / H2F','FM 7-22 / AFT','What event was removed from the old ACFT to create the AFT?','Standing Power Throw','Plank','Two-Mile Run','Sprint-Drag-Carry','a','The Standing Power Throw was removed.','basic',true),
('h2f-five-domains','AFT / H2F','FM 7-22','What are the five H2F domains?','Physical, nutritional, mental, spiritual, sleep','Strength, speed, power, agility, endurance','Training, education, experience, counseling, coaching','Offense, defense, stability, DSCA, protection','a','H2F includes physical, nutritional, mental, spiritual, and sleep readiness.','basic',true),
('nco-basic-responsibilities','NCO Creed / NCO Guide','TC 7-22.7','What are the two basic responsibilities of every leader in the NCO Creed?','Mission accomplishment and welfare of Soldiers','Awards and promotions','Uniforms and equipment','Counseling and punishment','a','The NCO Creed says mission accomplishment and welfare of Soldiers are always uppermost.','basic',true),
('nco-watchword','NCO Creed / NCO Guide','NCO Creed','What is the NCO watchword?','Competence','Courage','Loyalty','Discipline','a','The NCO Creed says: Competence is my watchword.','basic',true),
('soldier-creed-warrior-ethos','Soldier Creed','Soldier Creed','Which line is part of the Warrior Ethos?','I will never quit.','I will always be early.','I will always win awards.','I will never need help.','a','The Warrior Ethos includes: mission first, never accept defeat, never quit, and never leave a fallen comrade.','basic',true),
('army-song-title','Army Song','Army Song','What is the official title of the Army Song?','The Army Goes Rolling Along','Anchors Aweigh','The Caissons March Alone','America the Beautiful','a','The official Army Song is The Army Goes Rolling Along.','basic',true),
('general-order-first','General Orders','General Orders','What is the first general order?','Guard everything within the limits of my post','Obey my special orders only when supervised','Report only emergencies','Salute all officers indoors','a','The first general order is to guard everything within the limits of my post and quit my post only when properly relieved.','basic',true)
on conflict (slug) do update set
  category = excluded.category,
  source_publication = excluded.source_publication,
  question = excluded.question,
  option_a = excluded.option_a,
  option_b = excluded.option_b,
  option_c = excluded.option_c,
  option_d = excluded.option_d,
  correct_option = excluded.correct_option,
  explanation = excluded.explanation,
  difficulty = excluded.difficulty,
  active = excluded.active,
  deleted_at = null,
  updated_at = now();

notify pgrst, 'reload schema';

commit;
