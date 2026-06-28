import BoardPrepStudyClient from "@/components/board-prep/BoardPrepStudyClient";
import PublicBoardPrepStudyClient from "@/components/board-prep/PublicBoardPrepStudyClient";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/server/supabaseAdmin";

const FLASHCARD_MARKER = "__FLASHCARD__";
const MAX_PUBLIC_STUDY_QUESTIONS = 250;

function isFlashcardRow(row) {
  return row?.option_b === FLASHCARD_MARKER && row?.option_c === FLASHCARD_MARKER && row?.option_d === FLASHCARD_MARKER;
}

function getCorrectAnswer(row) {
  if (!row?.correct_option) return "";
  return row[`option_${row.correct_option}`] || "";
}

function shapeQuestion(row) {
  const isFlashcard = isFlashcardRow(row);
  return {
    ...row,
    question_type: isFlashcard ? "flashcard" : "multiple_choice",
    correct_answer: getCorrectAnswer(row),
  };
}

async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

async function loadPublicQuestions() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      data: [],
      error: "Public Board Prep study is not configured yet.",
    };
  }

  const { data, error } = await supabase
    .from("board_questions")
    .select("id, question, option_a, option_b, option_c, option_d, correct_option, explanation, category, source_publication, difficulty")
    .eq("active", true)
    .is("deleted_at", null)
    .order("category", { ascending: true })
    .order("question", { ascending: true })
    .limit(MAX_PUBLIC_STUDY_QUESTIONS);

  if (error) {
    console.error("public board prep study load failed:", error);
    return { data: [], error: "Could not load Board Prep questions." };
  }

  return { data: (data || []).map(shapeQuestion), error: null };
}

export default async function BoardPrepStudyPage() {
  const user = await getCurrentUser();

  if (user) return <BoardPrepStudyClient />;

  const { data, error } = await loadPublicQuestions();
  return <PublicBoardPrepStudyClient initialQuestions={data} initialError={error} />;
}
