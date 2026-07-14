alter table public.board_sessions
  drop constraint if exists board_sessions_score_check;

alter table public.board_sessions
  add constraint board_sessions_score_check
  check (score is null or (score >= -3 and score <= 5));
