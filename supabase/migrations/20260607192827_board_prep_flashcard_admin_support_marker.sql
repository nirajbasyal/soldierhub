-- Board Prep flashcard admin support marker
-- The app stores flashcards in the existing board_questions table using option_a as the answer,
-- option_b/option_c/option_d as internal flashcard markers, and correct_option = 'a'.
-- No schema change is required because existing columns support both multiple-choice and flashcard records.
select 1;
