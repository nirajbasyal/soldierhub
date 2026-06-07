-- Allow one daily Board Prep flashcard to count as -1 when marked need review.
-- The normal daily quiz still has five total reps, so valid scores are -1 through 5.

begin;

alter table public.board_sessions
  drop constraint if exists board_sessions_score_check;

alter table public.board_sessions
  add constraint board_sessions_score_check
  check (score is null or (score >= -1 and score <= 5));

commit;
