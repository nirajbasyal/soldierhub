-- ============================================================================
-- Board Prep admin dashboard, user requests, and seed questions
-- ============================================================================
-- Safe, idempotent migration for Soldier Hub Board Prep.
-- Adds admin-manageable questions, daily user sessions, and user question-change
-- requests. Existing user flow still shows only 5 shuffled active questions/day.
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
create unique index if not exists board_questions_slug_key on public.board_questions(slug) where slug is not null;

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
create trigger board_questions_set_updated_at
before update on public.board_questions
for each row execute function public.board_prep_set_updated_at();

drop trigger if exists board_sessions_set_updated_at on public.board_sessions;
create trigger board_sessions_set_updated_at
before update on public.board_sessions
for each row execute function public.board_prep_set_updated_at();

drop trigger if exists board_question_requests_set_updated_at on public.board_question_requests;
create trigger board_question_requests_set_updated_at
before update on public.board_question_requests
for each row execute function public.board_prep_set_updated_at();

alter table public.board_questions enable row level security;
alter table public.board_sessions enable row level security;
alter table public.board_question_requests enable row level security;

-- Users may read active study questions. Admins may manage every question.
drop policy if exists board_questions_read_active on public.board_questions;
create policy board_questions_read_active on public.board_questions
for select to authenticated
using (active = true and deleted_at is null);

drop policy if exists board_questions_admin_all on public.board_questions;
create policy board_questions_admin_all on public.board_questions
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- Users own their daily sessions. Admins can inspect if needed for support.
drop policy if exists board_sessions_own on public.board_sessions;
create policy board_sessions_own on public.board_sessions
for all to authenticated
using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- Users can create/read their own requests. Admins can review all requests.
drop policy if exists board_question_requests_own_insert on public.board_question_requests;
create policy board_question_requests_own_insert on public.board_question_requests
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists board_question_requests_own_read on public.board_question_requests;
create policy board_question_requests_own_read on public.board_question_requests
for select to authenticated
using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists board_question_requests_admin_update on public.board_question_requests;
create policy board_question_requests_admin_update on public.board_question_requests
for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- Seed concise, original Soldier Hub questions based on the uploaded MOI/study-guide topics.
insert into public.board_questions
(slug, category, source_publication, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, active)
values
('reg-adp-6-22','Regulation ID','ADP 6-22','What publication covers Army Leadership?','ADP 6-22','AR 670-1','TC 3-21.5','AR 27-10','a','ADP 6-22 covers Army Leadership and the Profession.','basic',true),
('reg-fm-6-22','Regulation ID','FM 6-22','What publication covers leader development?','FM 6-22','AR 600-8-2','TC 3-25.26','AR 750-1','a','FM 6-22 covers developing leaders.','basic',true),
('reg-atp-6-22-1','Regulation ID','ATP 6-22.1','What publication covers the counseling process?','ATP 6-22.1','ADP 3-0','AR 600-9','FM 3-11','a','ATP 6-22.1 is The Counseling Process.','basic',true),
('reg-ar-350-1','Regulation ID','AR 350-1','What regulation covers Army training and leader development?','AR 350-1','AR 600-20','AR 670-1','AR 623-3','a','AR 350-1 covers Army training and leader development.','basic',true),
('reg-ar-600-8-2','Regulation ID','AR 600-8-2','What regulation covers flags or suspension of favorable actions?','AR 600-8-2','AR 600-8-22','AR 600-25','AR 27-10','a','AR 600-8-2 covers suspension of favorable personnel actions.','basic',true),
('reg-adp-3-0','Regulation ID','ADP 3-0 / FM 3-0','What publication covers operations and warfighting functions?','ADP 3-0','AR 350-1','AR 600-20','TC 4-02.1','a','ADP 3-0 covers Operations. FM 3-0 gives current operations doctrine detail.','basic',true),
('reg-tc-3-25-26','Regulation ID','TC 3-25.26','What publication covers map reading and land navigation?','TC 3-25.26','TC 3-22.9','TC 3-21.5','FM 7-22','a','TC 3-25.26 covers map reading and land navigation.','basic',true),
('reg-tc-3-22-9','Regulation ID','TC 3-22.9','What publication covers rifle and carbine marksmanship?','TC 3-22.9','FM 3-11','AR 750-1','FM 6-27','a','TC 3-22.9 covers rifle and carbine.','basic',true),
('reg-ar-750-1','Regulation ID','AR 750-1 / DA PAM 750-1','What regulation covers Army maintenance policy?','AR 750-1','AR 600-8-19','AR 623-3','AR 600-25','a','AR 750-1 covers Army maintenance policy. DA PAM 750-1 gives procedures.','basic',true),
('reg-tc-4-02-1','Regulation ID','TC 4-02.1','What publication covers first aid?','TC 4-02.1','TC 3-25.26','ADP 7-0','AR 27-10','a','TC 4-02.1 covers first aid.','basic',true),
('reg-tc-7-22-7','Regulation ID','TC 7-22.7','What publication covers NCO duties and NCO history?','TC 7-22.7','ADP 6-0','AR 600-9','TC 4-02.3','a','TC 7-22.7 is the NCO Guide.','basic',true),
('reg-ar-623-3','Regulation ID','AR 623-3 / DA PAM 623-3','What regulation covers NCOERs and OERs?','AR 623-3','AR 600-8-22','AR 600-8-2','AR 27-10','a','AR 623-3 covers the Evaluation Reporting System.','basic',true),
('reg-ar-600-8-22','Regulation ID','AR 600-8-22','What regulation covers military awards?','AR 600-8-22','AR 600-8-19','AR 670-1','AR 600-9','a','AR 600-8-22 covers military awards.','basic',true),
('reg-ar-600-8-19','Regulation ID','AR 600-8-19','What regulation covers enlisted promotions and reductions?','AR 600-8-19','AR 350-1','AR 600-25','AR 750-1','a','AR 600-8-19 covers enlisted promotions and reductions.','basic',true),
('reg-ar-27-10','Regulation ID','AR 27-10','What regulation covers military justice and Article 15 procedures?','AR 27-10','AR 623-3','ADP 1','FM 7-22','a','AR 27-10 covers military justice.','basic',true),
('reg-ar-600-20','Regulation ID','AR 600-20','What regulation covers Army Command Policy, EO, and SHARP?','AR 600-20','AR 670-1','AR 600-8-2','TC 3-21.5','a','AR 600-20 covers Army Command Policy, including EO and SHARP.','basic',true),
('reg-fm-7-22','Regulation ID','FM 7-22','What publication covers Holistic Health and Fitness?','FM 7-22','AR 600-9','TC 4-02.1','FM 3-11','a','FM 7-22 covers H2F.','basic',true),
('reg-ar-600-9','Regulation ID','AR 600-9','What regulation covers the Army Body Composition Program?','AR 600-9','FM 7-22','AR 600-20','TC 3-21.5','a','AR 600-9 covers ABCP.','basic',true),
('reg-ar-600-25','Regulation ID','AR 600-25','What regulation covers salutes, honors, and customs and courtesies?','AR 600-25','AR 600-20','AR 27-10','AR 750-1','a','AR 600-25 covers salutes, honors, and visits of courtesy.','basic',true),
('reg-tc-4-02-3','Regulation ID','TC 4-02.3','What publication covers field hygiene and sanitation?','TC 4-02.3','TC 4-02.1','AR 350-1','FM 6-22','a','TC 4-02.3 covers field hygiene and sanitation.','basic',true),
('reg-tc-3-21-5','Regulation ID','TC 3-21.5','What publication covers drill and ceremonies?','TC 3-21.5','TC 3-25.26','AR 600-25','ADP 3-0','a','TC 3-21.5 covers drill and ceremonies.','basic',true),
('reg-adp-6-0','Regulation ID','ADP 6-0','What publication covers Mission Command?','ADP 6-0','ADP 7-0','FM 3-11','AR 670-1','a','ADP 6-0 covers Mission Command.','basic',true),
('reg-ar-670-1','Regulation ID','AR 670-1 / DA PAM 670-1','What regulation covers military wear and appearance?','AR 670-1','AR 600-20','AR 600-9','AR 350-1','a','AR 670-1 covers wear and appearance of Army uniforms and insignia.','basic',true),
('reg-fm-3-11','Regulation ID','FM 3-11','What manual covers CBRN operations?','FM 3-11','FM 7-22','FM 6-22','FM 6-27','a','FM 3-11 covers CBRN operations.','basic',true),
('leadership-definition','Leadership','ADP 6-22','What is Army leadership?','Influencing people with purpose, direction, and motivation','Giving orders only','Managing equipment records','Writing awards','a','Army leadership is influencing people by providing purpose, direction, and motivation.','basic',true),
('leadership-attributes','Leadership','ADP 6-22','What are the three leader attributes?','Character, presence, intellect','Leads, develops, achieves','Duty, honor, country','Plan, prepare, execute','a','Leader attributes are character, presence, and intellect.','basic',true),
('leadership-competencies','Leadership','ADP 6-22','What are the three leader competencies?','Leads, develops, achieves','Character, presence, intellect','Offense, defense, stability','Physical, mental, sleep','a','Leader competencies are leads, develops, and achieves.','basic',true),
('army-values','Leadership','ADP 6-22','What acronym helps remember the Army Values?','LDRSHIP','TLP','METT-TC','PMCS','a','LDRSHIP stands for the seven Army Values.','basic',true),
('nco-basic-responsibilities','NCO Guide','TC 7-22.7','What are an NCO''s two basic responsibilities?','Mission accomplishment and welfare of Soldiers','Uniforms and awards','Leave and finance','Range control and supply','a','The NCO Creed highlights mission accomplishment and the welfare of Soldiers.','basic',true),
('nco-three-duties','NCO Guide','TC 7-22.7','What are the three types of duty?','Specified, directed, implied','Formal, informal, casual','Primary, secondary, extra','Officer, NCO, Soldier','a','The three types of duty are specified, directed, and implied.','basic',true),
('warfighting-functions','Operations','ADP 3-0','How many warfighting functions are there?','Six','Four','Five','Seven','a','The six warfighting functions are command and control, movement and maneuver, intelligence, fires, sustainment, and protection.','basic',true),
('decisive-action','Operations','ADP 3-0','What are the four elements of decisive action?','Offense, defense, stability, DSCA','Attack, defend, delay, withdraw','Plan, prepare, execute, assess','Move, shoot, communicate, survive','a','Decisive action combines offense, defense, stability, and defense support of civil authorities.','basic',true),
('fm3-0-tenets','Operations','FM 3-0','What are the current FM 3-0 tenets of operations?','Agility, convergence, endurance, depth','Loyalty, duty, respect, honor','Crawl, walk, run, assess','Search, silence, segregate, tag','a','FM 3-0 emphasizes agility, convergence, endurance, and depth.','medium',true),
('counseling-form','Counseling','ATP 6-22.1','What form is used for developmental counseling?','DA Form 4856','DA Form 268','DA Form 638','DA Form 705','a','DA Form 4856 documents developmental counseling.','basic',true),
('counseling-categories','Counseling','ATP 6-22.1','What are the three major counseling categories?','Event, performance, professional growth','Formal, informal, emergency','Verbal, written, digital','Initial, monthly, annual','a','The three major categories are event, performance, and professional growth.','basic',true),
('training-responsibility','Training','ADP 7-0','Who is responsible for training?','Commanders','Only S1','Only supply','Only instructors','a','Commanders are responsible for training. NCOs train Soldiers, crews, and small teams.','basic',true),
('metl-meaning','Training','ADP 7-0','What does METL stand for?','Mission-Essential Task List','Military Education Training Level','Main Equipment Turn-in List','Mission Evaluation Team Log','a','METL means Mission-Essential Task List.','basic',true),
('ar670-1-directive','Wear & Appearance','Army Directive 2025-18','What 2025 directive updated grooming and appearance standards?','Army Directive 2025-18','Army Directive 2024-01','ALARACT 001-20','DA PAM 600-25','a','Army Directive 2025-18 updated appearance, grooming, and body-composition standards.','medium',true),
('promotion-points','Promotions','AR 600-8-19','What is the maximum promotion points for SGT/SSG?','800','500','600','1000','a','SGT and SSG promotion points are based on an 800-point system.','basic',true),
('flag-form','Flags','AR 600-8-2','What form is used to initiate a flag?','DA Form 268','DA Form 4856','DA Form 638','DA Form 705','a','DA Form 268 is used for suspension of favorable personnel actions.','basic',true),
('awards-form','Awards','AR 600-8-22','What form is used to recommend an award?','DA Form 638','DA Form 268','DA Form 4856','DA Form 2166-9','a','DA Form 638 is used to recommend awards.','basic',true),
('ncoer-form','Evaluations','AR 623-3 / DA PAM 623-3','What form series is used for NCOERs?','DA Form 2166-9 series','DA Form 4856','DA Form 638','DA Form 268','a','NCOERs use the DA Form 2166-9 series.','basic',true),
('sharp-stands-for','EO / SHARP','AR 600-20','What does SHARP stand for?','Sexual Harassment/Assault Response and Prevention','Soldier Health and Readiness Program','Safety Hazard Review Program','Sexual Health Army Reporting Policy','a','SHARP means Sexual Harassment/Assault Response and Prevention.','basic',true),
('general-orders-count','Customs & Courtesies','AR 600-25','How many general orders are commonly tested?','Three','Four','Five','Seven','a','Soldiers commonly memorize three general orders.','basic',true),
('article-15','Military Justice','AR 27-10','What is an Article 15?','Nonjudicial punishment','An award','A promotion board','A leave form','a','Article 15 is nonjudicial punishment under the UCMJ.','basic',true),
('pmcs','Maintenance','AR 750-1 / DA PAM 750-1','What does PMCS stand for?','Preventive Maintenance Checks and Services','Primary Mission Control System','Personnel Management Control Sheet','Post Maintenance Command System','a','PMCS means Preventive Maintenance Checks and Services.','basic',true),
('h2f-domains','H2F / AFT','FM 7-22','What are the five H2F domains?','Physical, nutritional, mental, spiritual, sleep','Strength, speed, power, agility, run','Food, water, shelter, sleep, pay','Mind, body, money, job, family','a','H2F includes physical, nutritional, mental, spiritual, and sleep readiness.','basic',true),
('aft-events','H2F / AFT','FM 7-22 / AFT guidance','How many events are in the Army Fitness Test?','Five','Six','Four','Seven','a','The AFT has five events.','basic',true),
('tccc-phases','First Aid','TC 4-02.1','What are the three TCCC phases?','Care Under Fire, Tactical Field Care, Tactical Evacuation Care','Stop, drop, roll','Plan, prepare, execute','Aid, litter, ambulance','a','TCCC phases are Care Under Fire, Tactical Field Care, and Tactical Evacuation Care.','basic',true),
('drill-command-parts','Drill & Ceremonies','TC 3-21.5','What are the two parts of a drill command?','Preparatory command and command of execution','Question and answer','Left and right','Start and stop','a','Most drill commands have a preparatory command and a command of execution.','basic',true),
('land-nav-terrain','Land Navigation','TC 3-25.26','What are the five major terrain features?','Hill, ridge, valley, saddle, depression','Draw, spur, cliff, cut, fill','Road, bridge, house, river, tree','North, south, east, west, center','a','The five major terrain features are hill, ridge, valley, saddle, and depression.','basic',true),
('sports','Weapons','TC 3-22.9','What does SPORTS start with?','Slap','Search','Secure','Sight','a','SPORTS is Slap, Pull, Observe, Release, Tap, Squeeze.','basic',true),
('cbrn-stands-for','CBRN','FM 3-11','What does CBRN stand for?','Chemical, Biological, Radiological, Nuclear','Combat, Basic, Rifle, Navigation','Command, Battle, Recon, Network','Care, Bleeding, Respiration, Nerves','a','CBRN means Chemical, Biological, Radiological, and Nuclear.','basic',true),
('code-conduct-articles','Code of Conduct','EO 10631 / DoD','How many articles are in the Code of Conduct?','Six','Three','Five','Seven','a','The Code of Conduct has six articles.','basic',true),
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
