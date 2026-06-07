-- ============================================================================
-- Board Prep score range update
-- ============================================================================
-- Daily Board Prep now uses this order:
--   1) flashcard   (+1 known / -1 need review)
--   2) multiple choice (+1 correct / 0 wrong)
--   3) flashcard   (+1 known / -1 need review)
--   4) multiple choice (+1 correct / 0 wrong)
--   5) flashcard   (+1 known / -1 need review)
--
-- Lowest possible score is -3. Highest possible score is 5.
-- ============================================================================

alter table public.board_sessions
  drop constraint if exists board_sessions_score_check;

alter table public.board_sessions
  add constraint board_sessions_score_check
  check (score is null or (score >= -3 and score <= 5));
