import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUESTIONS_PER_SESSION = 5;
const HISTORY_DAYS = 14;
const FLASHCARD_MARKER = "__FLASHCARD__";

function getAuthParts(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : null;
  return { authorization, token };
}

function createAuthedClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !accessToken) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function getRequestUserContext(request) {
  const { token } = getAuthParts(request);

  if (token) {
    const bearerSupabase = createAuthedClient(token);
    if (bearerSupabase) {
      const {
        data: { user },
        error,
      } = await bearerSupabase.auth.getUser(token);

      if (!error && user) {
        return { supabase: bearerSupabase, user };
      }
    }
  }

  // Fallback for mobile browsers where the bearer token can become stale but the
  // Supabase SSR cookies are still valid. This keeps Board Prep from falsely
  // showing "Sign in" when the app session exists.
  const cookieSupabase = await createServerSupabaseClient();
  if (cookieSupabase) {
    const {
      data: { user },
      error,
    } = await cookieSupabase.auth.getUser();

    if (!error && user) {
      return { supabase: cookieSupabase, user };
    }
  }

  return { supabase: null, user: null };
}

function computeStreak(history) {
  const completed = history.filter((h) => h.completed).map((h) => h.session_date).sort().reverse();
  if (!completed.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (completed[0] !== today && completed[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < completed.length; i++) {
    const a = new Date(completed[i - 1]);
    const b = new Date(completed[i]);
    if ((a - b) / 86_400_000 === 1) streak++;
    else break;
  }
  return streak;
}

function isFlashcardRow(row) {
  return row?.option_b === FLASHCARD_MARKER && row?.option_c === FLASHCARD_MARKER && row?.option_d === FLASHCARD_MARKER;
}

function getCorrectAnswer(row) {
  if (!row?.correct_option) return "";
  return row[`option_${row.correct_option}`] || "";
}

function shapeQuestion(row) {
  const isFlashcard = isFlashcardRow(row);
  return { ...row, question_type: isFlashcard ? "flashcard" : "multiple_choice", correct_answer: getCorrectAnswer(row) };
}

function shuffle(rows) {
  return [...rows].sort(() => Math.random() - 0.5);
}

function getSeenQuestionIds(sessions) {
  const seen = new Set();
  (sessions || []).forEach((session) => {
    (session.question_ids || []).forEach((questionId) => {
      if (questionId) seen.add(questionId);
    });
  });
  return seen;
}

function pickDailyQuestions(allRows = [], previousSessions = [], existingIds = []) {
  const byId = new Map(allRows.map((row) => [row.id, row]));
  const picked = [];
  const used = new Set();

  (existingIds || []).forEach((id) => {
    const row = byId.get(id);
    if (row && !used.has(id) && picked.length < QUESTIONS_PER_SESSION) {
      picked.push(row);
      used.add(id);
    }
  });

  const seen = getSeenQuestionIds(previousSessions);
  const remaining = allRows.filter((row) => !used.has(row.id));
  const ordered = [
    ...shuffle(remaining.filter((row) => !seen.has(row.id))),
    ...shuffle(remaining.filter((row) => seen.has(row.id))),
  ];

  ordered.forEach((row) => {
    if (picked.length < QUESTIONS_PER_SESSION && !used.has(row.id)) {
      picked.push(row);
      used.add(row.id);
    }
  });

  return picked.slice(0, QUESTIONS_PER_SESSION);
}

function exhaustedResponse({ session = null, history = [], questions = [], message }) {
  const streak = computeStreak(history);
  return NextResponse.json(
    {
      session,
      questions,
      streak,
      history,
      totalAnswered: Object.keys(session?.answers || {}).length,
      totalQuestions: questions.length || QUESTIONS_PER_SESSION,
      exhausted: true,
      message: message || "You finished all available Board Prep questions. Restart the quiz to keep practicing.",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

async function createOrTopUpSession({ supabase, userId, today, history, session }) {
  const [{ data: allRows, error: rowsError }, { data: previousSessions, error: previousError }] = await Promise.all([
    supabase.from("board_questions").select("id, option_b, option_c, option_d").eq("active", true).is("deleted_at", null).limit(500),
    supabase.from("board_sessions").select("question_ids").eq("user_id", userId).order("session_date", { ascending: false }).limit(500),
  ]);

  if (rowsError) return { response: NextResponse.json({ error: "Could not load Board Prep questions." }, { status: 500 }) };
  if (previousError) return { response: NextResponse.json({ error: "Could not load Board Prep progress." }, { status: 500 }) };
  if (!allRows?.length) {
    return { response: exhaustedResponse({ session, history, message: "No active Board Prep questions are available right now. Add or approve questions in the admin dashboard, then restart the quiz." }) };
  }

  const pickedIds = pickDailyQuestions(allRows, previousSessions, session?.question_ids || []).map((row) => row.id);

  if (!session) {
    const { data: newSession, error: insertError } = await supabase
      .from("board_sessions")
      .insert({ user_id: userId, session_date: today, question_ids: pickedIds, answers: {}, completed: false })
      .select("id, session_date, question_ids, answers, completed, score")
      .single();
    if (insertError) return { response: NextResponse.json({ error: "Could not start session." }, { status: 500 }) };
    return { session: newSession };
  }

  if (pickedIds.length <= (session.question_ids || []).length) return { session };

  const updatePayload = { question_ids: pickedIds };
  if (session.completed && Object.keys(session.answers || {}).length < pickedIds.length) {
    updatePayload.completed = false;
    updatePayload.score = null;
  }

  const { data: updatedSession, error: updateError } = await supabase
    .from("board_sessions")
    .update(updatePayload)
    .eq("id", session.id)
    .select("id, session_date, question_ids, answers, completed, score")
    .single();
  if (updateError) return { response: NextResponse.json({ error: "Could not prepare today's Board Prep quiz." }, { status: 500 }) };
  return { session: updatedSession };
}

export async function GET(request) {
  const rateLimit = await checkRateLimit(request, { keyPrefix: "board-prep:daily", limit: 30, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const { supabase, user } = await getRequestUserContext(request);
  if (!supabase || !user) return NextResponse.json({ error: "Sign in to access Board Prep." }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const [sessionResult, historyResult] = await Promise.all([
    supabase.from("board_sessions").select("id, session_date, question_ids, answers, completed, score").eq("user_id", user.id).eq("session_date", today).maybeSingle(),
    supabase.from("board_sessions").select("session_date, completed, score").eq("user_id", user.id).gte("session_date", new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10)).order("session_date", { ascending: false }),
  ]);

  if (sessionResult.error) return NextResponse.json({ error: "Could not load today's Board Prep session." }, { status: 500 });
  if (historyResult.error) return NextResponse.json({ error: "Could not load Board Prep history." }, { status: 500 });

  const history = historyResult.data || [];
  let session = sessionResult.data;

  if (!session || (session.question_ids || []).length < QUESTIONS_PER_SESSION) {
    const result = await createOrTopUpSession({ supabase, userId: user.id, today, history, session });
    if (result.response) return result.response;
    session = result.session;
  }

  const { data: questionRows, error: questionError } = await supabase
    .from("board_questions")
    .select("id, question, option_a, option_b, option_c, option_d, correct_option, explanation, category, source_publication, difficulty")
    .in("id", session.question_ids || []);
  if (questionError) return NextResponse.json({ error: "Could not load Board Prep questions." }, { status: 500 });

  const questions = (session.question_ids || []).map((qid) => questionRows?.find((q) => q.id === qid)).filter(Boolean).map(shapeQuestion);
  if (!session.completed && questions.length === 0) {
    return exhaustedResponse({ session, history, questions, message: "No active Board Prep questions are available right now. Add or approve questions in the admin dashboard, then restart the quiz." });
  }

  const streak = computeStreak(history);
  const totalAnswered = Object.keys(session.answers || {}).length;
  return NextResponse.json(
    { session, questions, streak, history, totalAnswered, totalQuestions: questions.length || QUESTIONS_PER_SESSION, exhausted: false },
    { status: 200, headers: { ...rateLimit.headers, "Cache-Control": "no-store" } }
  );
}
