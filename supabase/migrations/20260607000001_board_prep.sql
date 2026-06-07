-- Promotion Board Prep: daily 5-question quiz feature
-- Tables: board_questions (question bank) + board_sessions (one per user per day)

create table if not exists board_questions (
  id            uuid    primary key default gen_random_uuid(),
  question      text    not null,
  option_a      text    not null,
  option_b      text    not null,
  option_c      text    not null,
  option_d      text    not null,
  correct_option text   not null check (correct_option in ('a','b','c','d')),
  explanation   text,
  category      text    not null default 'General',
  difficulty    text    not null default 'medium' check (difficulty in ('easy','medium','hard')),
  active        boolean not null default true,
  created_at    timestamptz default now()
);

create table if not exists board_sessions (
  id            uuid    primary key default gen_random_uuid(),
  user_id       uuid    references auth.users not null,
  session_date  date    not null default current_date,
  question_ids  uuid[]  not null,
  answers       jsonb   not null default '{}',
  completed     boolean not null default false,
  score         int,
  created_at    timestamptz default now(),
  unique(user_id, session_date)
);

alter table board_questions enable row level security;
alter table board_sessions  enable row level security;

create policy "board_questions_read" on board_questions
  for select using (active = true);

create policy "board_sessions_own" on board_sessions
  for all using (auth.uid() = user_id);

create index if not exists board_sessions_user_date_idx
  on board_sessions(user_id, session_date desc);

-- ─── Seed: 30 real promotion board questions ────────────────────────────────

insert into board_questions
  (question, option_a, option_b, option_c, option_d, correct_option, explanation, category, difficulty)
values

-- Army Values ----------------------------------------------------------------
('What does the "L" in LDRSHIP stand for?',
 'Leadership', 'Loyalty', 'Liberty', 'Legacy',
 'b', 'Loyalty means bearing true faith and allegiance to the U.S. Constitution, the Army, your unit, and other Soldiers.',
 'Army Values', 'easy'),

('How many Army Values make up LDRSHIP?',
 '5', '6', '7', '8',
 'c', 'There are seven Army Values: Loyalty, Duty, Respect, Selfless Service, Honor, Integrity, and Personal Courage.',
 'Army Values', 'easy'),

('Which Army Value is defined as fulfilling your obligations?',
 'Loyalty', 'Duty', 'Honor', 'Selfless Service',
 'b', 'Duty means fulfilling your obligations — to the Army, the nation, and to your fellow Soldiers.',
 'Army Values', 'easy'),

('Which Army Value means treating people as they should be treated?',
 'Loyalty', 'Integrity', 'Respect', 'Selfless Service',
 'c', 'Respect means treating people as they should be treated — in the Army, this encompasses treating everyone with dignity regardless of rank.',
 'Army Values', 'easy'),

('What does "I" in LDRSHIP stand for?',
 'Innovation', 'Integrity', 'Intelligence', 'Initiative',
 'b', 'Integrity means doing what is right, legally and morally. It means always acting according to high moral principles.',
 'Army Values', 'easy'),

('Which Army Value means placing Soldier welfare before your own?',
 'Loyalty', 'Honor', 'Duty', 'Selfless Service',
 'd', 'Selfless Service means putting the welfare of the nation, the Army, and subordinates before your own. Service before self.',
 'Army Values', 'medium'),

('Personal Courage as an Army Value includes which of the following?',
 'Physical courage only', 'Moral courage only',
 'Both physical and moral courage', 'Neither — courage is a trait, not a value',
 'c', 'Personal Courage encompasses both physical courage (facing physical danger) and moral courage (doing what is right even when it is unpopular or difficult).',
 'Army Values', 'medium'),

-- Regulations ----------------------------------------------------------------
('Which Army Regulation covers uniform and appearance standards?',
 'AR 600-20', 'AR 670-1', 'AR 350-1', 'AR 623-3',
 'b', 'AR 670-1 (Wear and Appearance of Army Uniforms and Insignia) is the regulation governing how Soldiers wear their uniforms and maintain their appearance.',
 'Regulations', 'medium'),

('Which Army Regulation governs Army Command Policy?',
 'AR 670-1', 'AR 350-1', 'AR 600-20', 'AR 635-200',
 'c', 'AR 600-20 covers Army Command Policy, including the chain of command, military authority, and command relationships.',
 'Regulations', 'medium'),

('Which regulation governs Army Training?',
 'AR 350-1', 'AR 600-20', 'AR 670-1', 'AR 601-210',
 'a', 'AR 350-1 (Army Training and Leader Development) is the primary regulation governing training requirements and leader development programs.',
 'Regulations', 'medium'),

('What Army Regulation covers the NCO Evaluation Report (NCOER)?',
 'AR 600-20', 'AR 350-1', 'AR 670-1', 'AR 623-3',
 'd', 'AR 623-3 governs the Evaluation Reporting System, including the NCOER for NCOs and OER for officers.',
 'Regulations', 'hard'),

('Article 15 of the UCMJ is also known as?',
 'Summary Court-Martial', 'Administrative Separation',
 'Non-Judicial Punishment', 'General Court-Martial',
 'c', 'Article 15 of the UCMJ is Non-Judicial Punishment (NJP). It allows commanders to discipline Soldiers for minor offenses without going through a formal court-martial.',
 'Regulations', 'medium'),

-- Leadership -----------------------------------------------------------------
('Which FM covers Army Leadership?',
 'FM 6-22', 'FM 7-22', 'FM 3-22', 'FM 22-6',
 'a', 'FM 6-22 (Army Leadership and the Profession) is the foundational field manual covering Army leadership doctrine, attributes, and competencies.',
 'Leadership', 'medium'),

('What are the three levels of Army leadership?',
 'Junior, Mid-grade, Senior',
 'Direct, Organizational, Strategic',
 'Tactical, Operational, Strategic',
 'Team, Unit, Brigade',
 'b', 'The three Army leadership levels are Direct (interacting face-to-face with subordinates), Organizational (influencing several echelons), and Strategic (shaping the Army and environment).',
 'Leadership', 'medium'),

('What are the three leader attributes in Army doctrine (FM 6-22)?',
 'Loyalty, Duty, Respect',
 'Vision, Mission, Goals',
 'Character, Presence, Intellect',
 'Competence, Commitment, Courage',
 'c', 'FM 6-22 identifies three leader attributes: Character (who you are), Presence (how you appear), and Intellect (how you think and learn).',
 'Leadership', 'hard'),

('What are the three leader competencies in Army doctrine?',
 'Leads, Develops, Achieves',
 'Plans, Prepares, Executes',
 'Thinks, Acts, Communicates',
 'Trains, Mentors, Evaluates',
 'a', 'FM 6-22 identifies three core leader competencies: Leads (others, by example, through communication), Develops (the environment, others, oneself), and Achieves (results).',
 'Leadership', 'hard'),

('Which FM covers Physical Readiness Training?',
 'FM 6-22', 'FM 7-22', 'FM 21-20', 'FM 3-25.20',
 'b', 'FM 7-22 (Army Physical Readiness Training) covers all aspects of physical fitness training, including drills, exercises, and conditioning.',
 'Leadership', 'medium'),

('Mission Command philosophy empowers subordinates by:',
 'Providing detailed step-by-step instructions',
 'Exercising authority through mission orders and commanders intent',
 'Centralizing all decision-making at higher headquarters',
 'Eliminating the need for planning at lower levels',
 'b', 'Mission Command is the exercise of authority and direction using mission orders to enable disciplined initiative. Commanders provide intent so subordinates can act effectively without constant direction.',
 'Leadership', 'hard'),

-- Ranks & Structure ----------------------------------------------------------
('At what grade does a Soldier officially become an NCO?',
 'E-3 (Private First Class)',
 'E-4 (Corporal) or E-5 (Sergeant)',
 'E-6 (Staff Sergeant)',
 'E-7 (Sergeant First Class)',
 'b', 'NCO status begins at the grade of Corporal (E-4) or Sergeant (E-5). Specialists (E-4) are senior enlisted but not NCOs.',
 'Ranks & Structure', 'medium'),

('What is the highest enlisted rank in the Army?',
 'Command Sergeant Major (E-9)',
 'Sergeant Major (E-9)',
 'Sergeant Major of the Army (E-9S)',
 'Master Sergeant (E-8)',
 'c', 'The Sergeant Major of the Army (SMA) is a special enlisted pay grade (E-9S) and the highest ranking enlisted Soldier in the entire Army, serving as the senior advisor to the Chief of Staff of the Army.',
 'Ranks & Structure', 'medium'),

('How many enlisted pay grades (E-grades) exist in the Army?',
 '7', '9', '8', '10',
 'b', 'The Army has nine enlisted pay grades: E-1 (Private) through E-9 (Sergeant Major / Command Sergeant Major / Sergeant Major of the Army).',
 'Ranks & Structure', 'easy'),

('What is the rank insignia of a Staff Sergeant (E-6)?',
 'Two chevrons',
 'Three chevrons',
 'Three chevrons with one rocker',
 'Three chevrons with two rockers',
 'c', 'A Staff Sergeant (E-6) wears three chevrons (points up) with one rocker (curved bar) below them on the collar or sleeve.',
 'Ranks & Structure', 'easy'),

-- SHARP ----------------------------------------------------------------------
('What does SHARP stand for?',
 'Soldier Harassment And Retaliation Prevention',
 'Sexual Harassment/Assault Response and Prevention',
 'Soldier Health And Readiness Program',
 'Special Hazard Awareness and Risk Prevention',
 'b', 'SHARP stands for Sexual Harassment/Assault Response and Prevention. It is the Army program dedicated to eliminating sexual harassment and sexual assault.',
 'SHARP', 'easy'),

('What does SARC stand for in the context of SHARP?',
 'Sexual Assault Response Coordinator',
 'Soldier Assistance and Resource Center',
 'Senior Army Reserve Commander',
 'Safety and Risk Coordinator',
 'a', 'A SARC (Sexual Assault Response Coordinator) is a specially trained coordinator who oversees the Army SHARP program at installations and units.',
 'SHARP', 'medium'),

-- ACFT -----------------------------------------------------------------------
('How many events are in the Army Combat Fitness Test (ACFT)?',
 '4', '5', '6', '7',
 'c', 'The ACFT consists of six events: 3 Repetition Maximum Deadlift, Standing Power Throw, Hand-Release Push-Up, Sprint-Drag-Carry, Plank, and 2-Mile Run.',
 'ACFT', 'easy'),

('What is the maximum score per event on the ACFT?',
 '60 points', '100 points', '120 points', '150 points',
 'b', 'Each of the six ACFT events is scored on a scale of 0–100, for a maximum total score of 600 points.',
 'ACFT', 'easy'),

-- Army History ---------------------------------------------------------------
('When was the United States Army founded?',
 'June 14, 1775', 'July 4, 1776',
 'April 19, 1775', 'March 15, 1776',
 'a', 'The United States Army was founded on June 14, 1775, when the Continental Congress voted to create the Continental Army. June 14 is celebrated as the Army Birthday each year.',
 'Army History', 'medium'),

('Which battle is widely considered the birth of the Army''s NCO Corps?',
 'Battle of Bunker Hill', 'Battle of Saratoga',
 'Battle of Yorktown', 'Battle of Trenton',
 'a', 'The Battle of Bunker Hill (1775) highlighted the critical role of NCOs. General Washington later emphasized that the success of the Army depended heavily on the quality of its sergeants, establishing the NCO as the backbone of the Army.',
 'Army History', 'hard'),

-- Customs & Courtesies -------------------------------------------------------
('When are you generally NOT required to render a hand salute to an officer?',
 'Passing an officer outdoors on post',
 'When reporting to an officer indoors (not under arms)',
 'During the playing of the National Anthem outdoors',
 'When an officer presents you with a decoration',
 'b', 'Indoors, you do not salute unless you are under arms (carrying a weapon). Saluting outdoors is the standard; indoors the greeting is verbal.',
 'Customs & Courtesies', 'medium'),

('What is the proper action when an officer enters a room where enlisted Soldiers are present?',
 'Everyone stands at attention and the first to notice calls "At ease"',
 'The senior NCO present calls the room to "Attention"',
 'Everyone remains at ease unless the officer commands otherwise',
 'The duty NCO salutes on behalf of the group',
 'b', 'When an officer enters a room, the first person to notice calls "At ease" — except when a general officer enters, in which case the room is called to "Attention." The senior NCO present typically makes the call.',
 'Customs & Courtesies', 'medium');
