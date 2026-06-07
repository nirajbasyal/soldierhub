-- ============================================================================
-- Board Prep admin schema, requests, streak sessions, and starter question bank
-- ============================================================================
-- Branch-only migration for Board Prep.
-- Creates:
--   - board_questions: admin-managed MCQ board questions
--   - board_sessions: five-question daily user sessions with score/streak support
--   - board_question_requests: user requests to add/update/remove questions
--
-- The app intentionally shows 5 shuffled active questions per user per day.
-- ============================================================================

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

-- board_questions
drop policy if exists board_questions_read_active_or_admin on public.board_questions;
create policy board_questions_read_active_or_admin
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

drop policy if exists board_questions_admin_insert on public.board_questions;
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

drop policy if exists board_questions_admin_update on public.board_questions;
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

-- board_sessions
drop policy if exists board_sessions_own_select on public.board_sessions;
create policy board_sessions_own_select
on public.board_sessions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists board_sessions_own_insert on public.board_sessions;
create policy board_sessions_own_insert
on public.board_sessions
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists board_sessions_own_update on public.board_sessions;
create policy board_sessions_own_update
on public.board_sessions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- board_question_requests
drop policy if exists board_question_requests_own_or_admin_select on public.board_question_requests;
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

drop policy if exists board_question_requests_own_insert on public.board_question_requests;
create policy board_question_requests_own_insert
on public.board_question_requests
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists board_question_requests_admin_update on public.board_question_requests;
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
('reg-land-nav-tc-3-25-26','Regulation ID','TC 3-25.26','What publication covers map reading and land navigation?','TC 3-25.26','TC 3-21.5','AR 350-1','FM 6-27','a','TC 3-25.26 covers map reading and land navigation.','basic',true),
('reg-cbrn-fm-3-11','Regulation ID','FM 3-11','What manual covers CBRN operations?','FM 3-11','FM 7-22','AR 27-10','TC 4-02.1','a','FM 3-11 covers Chemical, Biological, Radiological, and Nuclear Operations.','basic',true),
('reg-law-land-warfare-fm-6-27','Regulation ID','FM 6-27','What manual covers the law of land warfare?','FM 27-10','FM 6-27','AR 600-25','ADP 7-0','b','FM 6-27 replaced the older FM 27-10.','basic',true),
('leadership-definition','Leadership','ADP 6-22','What is Army leadership?','Influencing people by purpose, direction, and motivation','Following orders only','Maintaining equipment only','Writing counseling forms','a','Army leadership is influencing people by providing purpose, direction, and motivation to accomplish the mission and improve the organization.','basic',true),
('leadership-three-attributes','Leadership','ADP 6-22','What are the three leader attributes?','Character, presence, intellect','Leads, develops, achieves','Loyalty, duty, respect','Direct, organizational, strategic','a','Attributes describe what a leader is: character, presence, and intellect.','basic',true),
('leadership-three-competencies','Leadership','ADP 6-22','What are the three leader competencies?','Character, presence, intellect','Leads, develops, achieves','Plan, prepare, execute','Shoot, move, communicate','b','Competencies describe what a leader does: leads, develops, and achieves.','basic',true),
('mission-command-seven-principles','Mission Command','ADP 6-0','How many principles of mission command are there?','Five','Six','Seven','Eight','c','The seven principles are competence, mutual trust, shared understanding, commander intent, mission orders, disciplined initiative, and risk acceptance.','basic',true),
('mission-command-disciplined-initiative','Mission Command','ADP 6-0','What is disciplined initiative?','Acting within commander intent when orders no longer fit','Waiting for perfect instructions','Ignoring the chain of command','Avoiding all risk','a','Disciplined initiative means taking action consistent with commander intent when conditions change.','basic',true),
('warfighting-functions-six','Operations','ADP 3-0','Which answer lists the six warfighting functions?','Leadership, information, training, morale, discipline, readiness','Command and control, movement and maneuver, intelligence, fires, sustainment, protection','Shoot, move, communicate, survive, attack, defend','Offense, defense, stability, DSCA, training, support','b','The six warfighting functions are command and control, movement and maneuver, intelligence, fires, sustainment, and protection.','basic',true),
('decisive-action-four','Operations','ADP 3-0','What are the four elements of decisive action?','Offense, defense, stability, and DSCA','Plan, prepare, execute, assess','Search, silence, segregate, safeguard','Care under fire, field care, evacuation, recovery','a','Decisive action includes offense, defense, stability, and defense support of civil authorities.','basic',true),
('training-commander-responsible','Training','ADP 7-0','Who is responsible for training?','Only S3','Commanders','Only NCOs','Only schools','b','Commanders are responsible for training; NCOs train individuals, crews, and small teams.','basic',true),
('training-metl','Training','ADP 7-0','What does METL stand for?','Mission Essential Task List','Military Equipment Transfer Log','Medical Evacuation Task List','Mission Evaluation Training Line','a','METL means Mission Essential Task List.','basic',true),
('nco-two-responsibilities','NCO Guide','TC 7-22.7','What are the two basic responsibilities of every NCO?','Mission accomplishment and welfare of Soldiers','Awards and promotions','Uniforms and salutes','Training and leave forms','a','The NCO Creed emphasizes mission accomplishment and welfare of Soldiers.','basic',true),
('nco-three-duties','NCO Guide','TC 7-22.7','What are the three types of duty?','Specified, directed, implied','Assigned, optional, local','Primary, secondary, temporary','Written, verbal, implied','a','The three types of duty are specified, directed, and implied.','basic',true),
('counseling-form-da-4856','Counseling','ATP 6-22.1','What form is used for developmental counseling?','DA Form 4856','DA Form 268','DA Form 638','DA Form 705','a','DA Form 4856 is the Developmental Counseling Form.','basic',true),
('counseling-three-categories','Counseling','ATP 6-22.1','What are the three categories of developmental counseling?','Event, performance, professional growth','Formal, informal, legal','Initial, monthly, final','Corrective, punitive, administrative','a','Developmental counseling categories are event, performance, and professional growth.','basic',true),
('ar-670-1-da-pam','Wear and Appearance','AR 670-1 / DA PAM 670-1','Which publication gives detailed how-to instructions and illustrations for uniform wear?','DA PAM 670-1','AR 27-10','ADP 6-0','TC 4-02.1','a','AR 670-1 sets policy; DA PAM 670-1 gives detailed guidance.','basic',true),
('ar-670-1-2025-directive','Wear and Appearance','Army Directive 2025-18','Which 2025 directive updated appearance, grooming, and body composition standards?','Army Directive 2025-18','ALARACT 001-2020','FM 3-0','TC 7-22.7','a','Army Directive 2025-18 updated appearance, grooming, uniform wear, and body composition standards.','basic',true),
('promotions-total-points','Promotions','AR 600-8-19','What is the maximum promotion point total for SGT and SSG?','500','600','700','800','d','Semi-centralized promotion point total is 800.','basic',true),
('flags-form-da-268','Flags','AR 600-8-2','What form is used for a flag?','DA Form 268','DA Form 4856','DA Form 638','DA Form 2166-9','a','DA Form 268 is used for suspension of favorable personnel actions.','basic',true),
('awards-form-da-638','Awards','AR 600-8-22','What form is used to recommend an award?','DA Form 638','DA Form 705','DA Form 4856','DA Form 31','a','DA Form 638 is used to recommend awards.','basic',true),
('ncoer-form-series','Evaluations','AR 623-3 / DA PAM 623-3','What form series is used for NCOERs?','DA Form 2166-9 series','DA Form 4856','DA Form 268','DA Form 5988-E','a','NCOERs use the DA Form 2166-9 series.','basic',true),
('sharp-two-report-types','SHARP','AR 600-20','What are the two sexual assault reporting options?','Restricted and unrestricted','Formal and informal','Open and closed','Verbal and written','a','SHARP reporting options are restricted and unrestricted.','basic',true),
('eo-purpose','Equal Opportunity','AR 600-20','What is the purpose of the EO program?','Fair treatment and a climate free from unlawful discrimination','Promotion points','Uniform inspections','Weapons qualification','a','EO supports fair treatment and a command climate free from unlawful discrimination.','basic',true),
('general-order-one','General Orders','AR 600-25 / local board packets','What is the first General Order?','Guard everything within the limits of my post and quit my post only when properly relieved','Obey my special orders','Report emergencies to the commander of the relief','Never leave a fallen comrade','a','The first General Order begins with guarding everything within the limits of your post.','basic',true),
('general-order-two','General Orders','AR 600-25 / local board packets','What is the second General Order?','Obey my special orders and perform all duties in a military manner','Guard everything within the limits of my post','Report violations and emergencies','Render all salutes','a','The second General Order is about obeying special orders and performing duties in a military manner.','basic',true),
('general-order-three','General Orders','AR 600-25 / local board packets','What is the third General Order?','Report violations, emergencies, and anything not covered in my instructions','Guard my post only during daylight','Only report to my squad leader','Never quit','a','The third General Order is about reporting violations, emergencies, and uncovered instructions.','basic',true),
('military-justice-article-15','Military Justice','AR 27-10','What is an Article 15?','Nonjudicial punishment','A counseling form','A promotion board','A field sanitation team','a','Article 15 is nonjudicial punishment under the UCMJ.','basic',true),
('maintenance-pmcs','Maintenance','AR 750-1 / DA PAM 750-1','What does PMCS stand for?','Preventive Maintenance Checks and Services','Property Management Control System','Personnel Movement Control Sheet','Preventive Medical Care Section','a','PMCS means Preventive Maintenance Checks and Services.','basic',true),
('h2f-five-domains','H2F','FM 7-22','What are the five H2F domains?','Physical, nutritional, mental, spiritual, sleep','Strength, speed, power, balance, agility','Medical, dental, vision, hearing, sleep','Cardio, weights, diet, recovery, weapons','a','H2F domains are physical, nutritional, mental, spiritual, and sleep readiness.','basic',true),
('aft-five-events','AFT','Current Army fitness guidance / FM 7-22','How many events are in the Army Fitness Test?','Four','Five','Six','Seven','b','The AFT has five events.','basic',true),
('aft-removed-event','AFT','Current Army fitness guidance / FM 7-22','What old ACFT event was removed for the AFT?','Standing Power Throw','Two-mile run','Plank','Deadlift','a','The Standing Power Throw was removed.','basic',true),
('abcp-waist-height-ratio','ABCP','AR 600-9 / current directive','What does WHtR mean in body composition?','Waist-to-Height Ratio','Weight-to-Health Review','Weekly Height Requirement','Waist-to-Hip Record','a','WHtR means Waist-to-Height Ratio. Verify current standards with the latest directive.','basic',true),
('first-aid-march','First Aid','TC 4-02.1','What does the M in MARCH stand for?','Massive hemorrhage','Movement','Medication','Mission','a','MARCH begins with Massive hemorrhage.','basic',true),
('tccc-three-phases','First Aid','TC 4-02.1','Which is a phase of TCCC?','Care Under Fire','Classroom care','Recovery care','Sick call care','a','TCCC phases include Care Under Fire, Tactical Field Care, and Tactical Evacuation Care.','basic',true),
('field-sanitation-dnbi','Field Sanitation','TC 4-02.3','What does DNBI stand for?','Disease and non-battle injury','Direct navigation battle indicator','Daily nutrition body index','Defense network battle instruction','a','DNBI means disease and non-battle injury.','basic',true),
('drill-two-parts-command','Drill and Ceremonies','TC 3-21.5','What are the two parts of most drill commands?','Preparatory command and command of execution','Question and answer','Left and right','First and second','a','Most drill commands have a preparatory command and a command of execution.','basic',true),
('land-nav-three-norths','Land Navigation','TC 3-25.26','What are the three norths?','True, magnetic, grid','Left, right, center','Hill, valley, ridge','Black, blue, brown','a','The three norths are true north, magnetic north, and grid north.','basic',true),
('land-nav-major-terrain','Land Navigation','TC 3-25.26','How many major terrain features are there?','Three','Five','Seven','Nine','b','There are five major terrain features: hill, ridge, valley, saddle, and depression.','basic',true),
('weapons-sports','Weapons','TC 3-22.9','What does SPORTS help with?','Immediate action for weapon malfunction','Land navigation','Counseling','CBRN reporting','a','SPORTS is a commonly taught immediate action method.','basic',true),
('cbrn-mopp-4','CBRN','FM 3-11','What is the highest MOPP level?','MOPP 1','MOPP 2','MOPP 3','MOPP 4','d','MOPP 4 is the highest protective posture.','basic',true),
('code-conduct-six','Code of Conduct','Executive Order 10631 / DoD','How many articles are in the Code of Conduct?','Four','Five','Six','Seven','c','The Code of Conduct has six articles.','basic',true),
('nco-creed-watchword','Creeds','NCO Creed','What is the NCO Creed watchword?','Competence','Convenience','Comfort','Control','a','The NCO Creed says, Competence is my watchword.','basic',true),
('soldier-creed-warrior-ethos','Creeds','Soldier Creed','Which line is part of the Warrior Ethos?','I will never quit','I will avoid all risk','I will always work alone','I will only follow written orders','a','The Warrior Ethos includes: I will never quit.','basic',true),
('army-song-title','Creeds and Songs','Army Song','What is the official song of the U.S. Army?','The Army Goes Rolling Along','The Star-Spangled Banner','Anchors Aweigh','The Marines Hymn','a','The official Army song is The Army Goes Rolling Along.','basic',true)
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
  active = true,
  deleted_at = null,
  updated_at = now();

commit;
