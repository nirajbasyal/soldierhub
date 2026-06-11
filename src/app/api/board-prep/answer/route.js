import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { getBearerToken, createAuthedSupabaseClient } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeSavedAnswer(rawAnswer, question) {
  if (!rawAnswer) return null;

  if (typeof rawAnswer === "string") {
    return {
      answerMode: "multiple_choice",
      selectedOption: rawAnswer,
      points: rawAnswer === question.correct_option ? 1 : 0,
    };
  }

  if (rawAnswer.answer_mode === "flashcard") {
    return {
      answerMode: "flashcard",
      selectedOption: rawAnswer.selected_option,
      points: rawAnswer.selected_option === "known" ? 1 : -1,
    };
  }

  return {
    answerMode: "multiple_choice",
    selectedOption: rawAnswer.selected_option,
    points: rawAnswer.selected_option === question.correct_option ? 1 : 0,
  };
}

export async function POST(request) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: "board-prep:answer",
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Sign in to submit answers." }, { status: 401 });
  }

  const supabase = createAuthedSupabaseClient(accessToken);
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Sign in to submit answers." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { session_id, question_id } = body || {};
  const answer_mode = body?.answer_mode === "flashcard" ? "flashcard" : "multiple_choice";
  const selected_option = String(body?.selected_option || "").trim().toLowerCase();
  const validMultipleChoice = answer_mode === "multiple_choice" && ["a", "b", "c", "d"].includes(selected_option);
  const validFlashcard = answer_mode === "flashcard" && ["known", "review"].includes(selected_option);

  if (!session_id || !question_id || (!validMultipleChoice && !validFlashcard)) {
    return NextResponse.json({ error: "Invalid answer submission." }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("board_sessions")
    .select("id, question_ids, answers, completed")
    .eq("id", session_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (session.completed) {
    return NextResponse.json({ error: "This session is already complete." }, { status: 409 });
  }

  if (!session.question_ids?.includes(question_id)) {
    return NextResponse.json({ error: "Question not in this session." }, { status: 400 });
  }

  const { data: question } = await supabase
    .from("board_questions")
    .select("correct_option, explanation")
    .eq("id", question_id)
    .maybeSingle();

  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  const points = answer_mode === "flashcard"
    ? (selected_option === "known" ? 1 : -1)
    : (selected_option === question.correct_option ? 1 : 0);

  const updatedAnswers = {
    ...(session.answers || {}),
    [question_id]: {
      answer_mode,
      selected_option,
      points,
    },
  };
  const totalAnswered = Object.keys(updatedAnswers).length;
  const isNowComplete = totalAnswered >= session.question_ids.length;

  let score = null;
  if (isNowComplete) {
    const { data: allQuestions } = await supabase
      .from("board_questions")
      .select("id, correct_option")
      .in("id", session.question_ids);

    score = (allQuestions || []).reduce((sum, q) => {
      const normalized = normalizeSavedAnswer(updatedAnswers[q.id], q);
      return sum + (normalized?.points || 0);
    }, 0);
  }

  const { data: updatedSession, error: updateError } = await supabase
    .from("board_sessions")
    .update({
      answers: updatedAnswers,
      completed: isNowComplete,
      ...(isNowComplete ? { score } : {}),
    })
    .eq("id", session_id)
    .eq("user_id", user.id)
    .select("id, answers, completed, score")
    .single();

  if (updateError) {
    console.error("board_sessions update failed:", updateError);
    return NextResponse.json({ error: "Could not save answer." }, { status: 500 });
  }

  return NextResponse.json(
    {
      correct: points > 0,
      points,
      answer_mode,
      correct_option: question.correct_option,
      explanation: question.explanation,
      session: updatedSession,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
