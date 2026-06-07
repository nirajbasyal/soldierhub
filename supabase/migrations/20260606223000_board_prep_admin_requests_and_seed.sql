-- ============================================================================
-- Board Prep admin dashboard, user requests, sessions, and seed questions
-- ============================================================================

begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.board_questions (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  category text not null default 'General',
  source_publication text,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('a','b','c','d')),
  explanation text not null default '',
  difficulty text not null default 'basic' check (difficulty in ('basic','medium','hard')),
  active boolean not null default true,
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_questions add column if not exists slug text;
alter table public.board_questions add column if not exists source_publication text;
alter table public.board_questions add column if not exists deleted_at timestamptz;
alter table public.board_questions add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.board_questions add column if not exists updated_by uuid references auth.users(id) on delete set null;
create unique index if not exists board_questions_slug_unique_idx on public.board_questions(slug);

create table if not exists public.board_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  question_ids uuid[] not null default '{}',
  answers jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_sessions_user_date_key unique (user_id, session_date),
  constraint board_sessions_score_range check (score is null or (score >= 0 and score <= 5))
);

create table if not exists public.board_question_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('add','update','remove')),
  question_id uuid references public.board_questions(id) on delete set null,
  category text,
  message text not null,
  suggested_question text,
  suggested_answer text,
  status text not null default 'pending' check (status in ('pending','reviewed','approved','rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_questions_active_category_idx on public.board_questions(active, category, created_at desc) where deleted_at is null;
create index if not exists board_questions_source_idx on public.board_questions(source_publication);
create index if not exists board_sessions_user_date_idx on public.board_sessions(user_id, session_date desc);
create index if not exists board_question_requests_status_idx on public.board_question_requests(status, created_at desc);
create index if not exists board_question_requests_user_idx on public.board_question_requests(user_id, created_at desc);

create or replace function public.board_prep_set_updated_at()
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
create trigger board_questions_set_updated_at before update on public.board_questions for each row execute function public.board_prep_set_updated_at();

drop trigger if exists board_sessions_set_updated_at on public.board_sessions;
create trigger board_sessions_set_updated_at before update on public.board_sessions for each row execute function public.board_prep_set_updated_at();

drop trigger if exists board_question_requests_set_updated_at on public.board_question_requests;
create trigger board_question_requests_set_updated_at before update on public.board_question_requests for each row execute function public.board_prep_set_updated_at();

alter table public.board_questions enable row level security;
alter table public.board_sessions enable row level security;
alter table public.board_question_requests enable row level security;

drop policy if exists board_questions_read_active on public.board_questions;
create policy board_questions_read_active on public.board_questions for select to authenticated using (active = true and deleted_at is null);

drop policy if exists board_questions_admin_all on public.board_questions;
create policy board_questions_admin_all on public.board_questions for all to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists board_sessions_own on public.board_sessions;
create policy board_sessions_own on public.board_sessions for all to authenticated
using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists board_question_requests_own_insert on public.board_question_requests;
create policy board_question_requests_own_insert on public.board_question_requests for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists board_question_requests_own_read on public.board_question_requests;
create policy board_question_requests_own_read on public.board_question_requests for select to authenticated
using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists board_question_requests_admin_update on public.board_question_requests;
create policy board_question_requests_admin_update on public.board_question_requests for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

insert into public.board_questions
(slug, category, source_publication, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, active)
values
('reg-adp-6-22','Regulation ID','ADP 6-22','What publication covers Army Leadership?','ADP 6-22','AR 670-1','TC 3-21.5','AR 27-10','a','ADP 6-22 covers Army Leadership and the Profession.','basic',true),
('reg-atp-6-22-1','Regulation ID','ATP 6-22.1','What publication covers the counseling process?','ATP 6-22.1','ADP 3-0','AR 600-9','FM 3-11','a','ATP 6-22.1 is The Counseling Process.','basic',true),
('reg-ar-350-1','Regulation ID','AR 350-1','What regulation covers Army training and leader development?','AR 350-1','AR 600-20','AR 670-1','AR 623-3','a','AR 350-1 covers Army training and leader development.','basic',true),
('reg-adp-3-0','Regulation ID','ADP 3-0 / FM 3-0','What publication covers operations and warfighting functions?','ADP 3-0','AR 350-1','AR 600-20','TC 4-02.1','a','ADP 3-0 covers Operations. FM 3-0 gives current operations doctrine detail.','basic',true),
('reg-ar-670-1','Regulation ID','AR 670-1 / DA PAM 670-1','What regulation covers military wear and appearance?','AR 670-1','AR 600-20','AR 600-9','AR 350-1','a','AR 670-1 covers wear and appearance of Army uniforms and insignia.','basic',true),
('reg-ar-600-20','Regulation ID','AR 600-20','What regulation covers Army Command Policy, EO, and SHARP?','AR 600-20','AR 670-1','AR 600-8-2','TC 3-21.5','a','AR 600-20 covers Army Command Policy, including EO and SHARP.','basic',true),
('reg-fm-7-22','Regulation ID','FM 7-22','What publication covers Holistic Health and Fitness?','FM 7-22','AR 600-9','TC 4-02.1','FM 3-11','a','FM 7-22 covers H2F.','basic',true),
('leadership-definition','Leadership','ADP 6-22','What is Army leadership?','Influencing people with purpose, direction, and motivation','Giving orders only','Managing equipment records','Writing awards','a','Army leadership is influencing people by providing purpose, direction, and motivation.','basic',true),
('leadership-attributes','Leadership','ADP 6-22','What are the three leader attributes?','Character, presence, intellect','Leads, develops, achieves','Duty, honor, country','Plan, prepare, execute','a','Leader attributes are character, presence, and intellect.','basic',true),
('leadership-competencies','Leadership','ADP 6-22','What are the three leader competencies?','Leads, develops, achieves','Character, presence, intellect','Offense, defense, stability','Physical, mental, sleep','a','Leader competencies are leads, develops, and achieves.','basic',true),
('nco-basic-responsibilities','NCO Guide','TC 7-22.7','What are an NCO''s two basic responsibilities?','Mission accomplishment and welfare of Soldiers','Uniforms and awards','Leave and finance','Range control and supply','a','The NCO Creed highlights mission accomplishment and the welfare of Soldiers.','basic',true),
('nco-three-duties','NCO Guide','TC 7-22.7','What are the three types of duty?','Specified, directed, implied','Formal, informal, casual','Primary, secondary, extra','Officer, NCO, Soldier','a','The three types of duty are specified, directed, and implied.','basic',true),
('warfighting-functions','Operations','ADP 3-0','How many warfighting functions are there?','Six','Four','Five','Seven','a','There are six warfighting functions.','basic',true),
('decisive-action','Operations','ADP 3-0','What are the four elements of decisive action?','Offense, defense, stability, DSCA','Attack, defend, delay, withdraw','Plan, prepare, execute, assess','Move, shoot, communicate, survive','a','Decisive action combines offense, defense, stability, and DSCA.','basic',true),
('counseling-form','Counseling','ATP 6-22.1','What form is used for developmental counseling?','DA Form 4856','DA Form 268','DA Form 638','DA Form 705','a','DA Form 4856 documents developmental counseling.','basic',true),
('metl-meaning','Training','ADP 7-0','What does METL stand for?','Mission-Essential Task List','Military Education Training Level','Main Equipment Turn-in List','Mission Evaluation Team Log','a','METL means Mission-Essential Task List.','basic',true),
('flag-form','Flags','AR 600-8-2','What form is used to initiate a flag?','DA Form 268','DA Form 4856','DA Form 638','DA Form 705','a','DA Form 268 is used for suspension of favorable personnel actions.','basic',true),
('awards-form','Awards','AR 600-8-22','What form is used to recommend an award?','DA Form 638','DA Form 268','DA Form 4856','DA Form 2166-9','a','DA Form 638 is used to recommend awards.','basic',true),
('article-15','Military Justice','AR 27-10','What is an Article 15?','Nonjudicial punishment','An award','A promotion board','A leave form','a','Article 15 is nonjudicial punishment under the UCMJ.','basic',true),
('h2f-domains','H2F / AFT','FM 7-22','What are the five H2F domains?','Physical, nutritional, mental, spiritual, sleep','Strength, speed, power, agility, run','Food, water, shelter, sleep, pay','Mind, body, money, job, family','a','H2F includes physical, nutritional, mental, spiritual, and sleep readiness.','basic',true),
('aft-events','H2F / AFT','FM 7-22 / AFT guidance','How many events are in the Army Fitness Test?','Five','Six','Four','Seven','a','The AFT has five events.','basic',true),
('land-nav-terrain','Land Navigation','TC 3-25.26','What are the five major terrain features?','Hill, ridge, valley, saddle, depression','Draw, spur, cliff, cut, fill','Road, bridge, house, river, tree','North, south, east, west, center','a','The five major terrain features are hill, ridge, valley, saddle, and depression.','basic',true),
('sports','Weapons','TC 3-22.9','What does SPORTS start with?','Slap','Search','Secure','Sight','a','SPORTS is Slap, Pull, Observe, Release, Tap, Squeeze.','basic',true),
('cbrn-stands-for','CBRN','FM 3-11','What does CBRN stand for?','Chemical, Biological, Radiological, Nuclear','Combat, Basic, Rifle, Navigation','Command, Battle, Recon, Network','Care, Bleeding, Respiration, Nerves','a','CBRN means Chemical, Biological, Radiological, and Nuclear.','basic',true),
('law-of-war','Law of War','FM 6-27','What manual covers the law of land warfare?','FM 6-27','FM 27-10 only','AR 670-1','TC 3-22.9','a','FM 6-27 replaced the older FM 27-10 as the current law-of-land-warfare manual.','basic',true)
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

commit;
