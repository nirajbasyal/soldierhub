import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

function createAuthedClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
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

  const supabase = createAuthedClient(accessToken);
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

  const { session_id, question_id, selected_option } = body || {};

  if (!session_id || !question_id || !["a", "b", "c", "d"].includes(selected_option)) {
    return NextResponse.json({ error: "Invalid answer submission." }, { status: 400 });
  }

  // Load the session (RLS ensures it belongs to this user)
  const { data: session, error: sessionError } = await supabase
    .from("board_sessions")
    .select("id, question_ids, answers, completed")
    .eq("id", session_id)
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

  // Load the question to grade the answer
  const { data: question } = await supabase
    .from("board_questions")
    .select("correct_option, explanation")
    .eq("id", question_id)
    .maybeSingle();

  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  const updatedAnswers = { ...(session.answers || {}), [question_id]: selected_option };
  const totalAnswered = Object.keys(updatedAnswers).length;
  const isNowComplete = totalAnswered >= session.question_ids.length;

  let score = null;
  if (isNowComplete) {
    // Fetch all questions to compute final score
    const { data: allQuestions } = await supabase
      .from("board_questions")
      .select("id, correct_option")
      .in("id", session.question_ids);

    score = (allQuestions || []).filter(
      (q) => updatedAnswers[q.id] === q.correct_option
    ).length;
  }

  const { data: updatedSession, error: updateError } = await supabase
    .from("board_sessions")
    .update({
      answers: updatedAnswers,
      completed: isNowComplete,
      ...(isNowComplete ? { score } : {}),
    })
    .eq("id", session_id)
    .select("id, answers, completed, score")
    .single();

  if (updateError) {
    console.error("board_sessions update failed:", updateError);
    return NextResponse.json({ error: "Could not save answer." }, { status: 500 });
  }

  return NextResponse.json(
    {
      correct: selected_option === question.correct_option,
      correct_option: question.correct_option,
      explanation: question.explanation,
      session: updatedSession,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
