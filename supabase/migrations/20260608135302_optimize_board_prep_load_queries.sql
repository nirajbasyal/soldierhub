create index if not exists idx_board_questions_active_id
on public.board_questions (id)
where active = true and deleted_at is null;

create index if not exists idx_board_questions_active_question
on public.board_questions (category, question, id)
where active = true and deleted_at is null;

create index if not exists idx_board_sessions_user_date_cover
on public.board_sessions (user_id, session_date desc)
include (question_ids, answers, completed, score);
