create index if not exists board_memory_items_created_by_idx
  on public.board_memory_items (created_by);

create index if not exists board_memory_items_updated_by_idx
  on public.board_memory_items (updated_by);

create index if not exists board_question_requests_user_id_idx
  on public.board_question_requests (user_id);

create index if not exists board_question_requests_question_id_idx
  on public.board_question_requests (question_id);

create index if not exists board_question_requests_reviewed_by_idx
  on public.board_question_requests (reviewed_by);

create index if not exists board_questions_created_by_idx
  on public.board_questions (created_by);

create index if not exists board_questions_updated_by_idx
  on public.board_questions (updated_by);
