import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUESTIONS_PER_SESSION = 5;
const HISTORY_DAYS = 14;
const FLASHCARD_MARKER = "__FLASHCARD__";

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

function computeStreak(history) {
  const completed = history
    .filter((h) => h.completed)
    .map((h) => h.session_date)
    .sort()
    .reverse();

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
  return {
    ...row,
    question_type: isFlashcard ? "flashcard" : "multiple_choice",
    correct_answer: getCorrectAnswer(row),
  };
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

function shuffle(rows) {
  return [...rows].sort(() => Math.random() - 0.5);
}

function pickDailyQuestions(unseenRows) {
  const flashcards = shuffle(unseenRows.filter(isFlashcardRow));
  const multipleChoice = shuffle(unseenRows.filter((row) => !isFlashcardRow(row)));

  if (!multipleChoice.length && flashcards.length) {
    return flashcards.slice(0, QUESTIONS_PER_SESSION);
  }

  if (multipleChoice.length < 2 && flashcards.length) {
    return flashcards.slice(0, QUESTIONS_PER_SESSION);
  }

  const picked = [];
  picked.push(...multipleChoice.slice(0, 2));
  picked.push(...flashcards.slice(0, QUESTIONS_PER_SESSION - picked.length));

  if (picked.length < QUESTIONS_PER_SESSION) {
    const used = new Set(picked.map((row) => row.id));
    const fallback = shuffle(unseenRows.filter((row) => !used.has(row.id)));
    picked.push(...fallback.slice(0, QUESTIONS_PER_SESSION - picked.length));
  }

  return shuffle(picked).slice(0, QUESTIONS_PER_SESSION);
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

export async function GET(request) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: "board-prep:daily",
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Sign in to access Board Prep." }, { status: 401 });
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
    return NextResponse.json({ error: "Sign in to access Board Prep." }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const [sessionResult, historyResult] = await Promise.all([
    supabase
      .from("board_sessions")
      .select("id, session_date, question_ids, answers, completed, score")
      .eq("user_id", user.id)
      .eq("session_date", today)
      .maybeSingle(),
    supabase
      .from("board_sessions")
      .select("session_date, completed, score")
      .eq("user_id", user.id)
      .gte("session_date", new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10))
      .order("session_date", { ascending: false }),
  ]);

  const history = historyResult.data || [];
  let session = sessionResult.data;

  if (!session) {
    const [{ data: allRows, error: rowsError }, { data: previousSessions, error: previousError }] = await Promise.all([
      supabase
        .from("board_questions")
        .select("id, option_b, option_c, option_d")
        .eq("active", true)
        .is("deleted_at", null),
      supabase
        .from("board_sessions")
        .select("question_ids")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false })
        .limit(500),
    ]);

    if (rowsError) {
      console.error("board_questions daily id load failed:", rowsError);
      return NextResponse.json({ error: "Could not load Board Prep questions." }, { status: 500 });
    }

    if (previousError) {
      console.error("board_sessions previous question load failed:", previousError);
      return NextResponse.json({ error: "Could not load Board Prep progress." }, { status: 500 });
    }

    if (!allRows?.length) {
      return exhaustedResponse({
        history,
        message: "No active Board Prep questions are available right now. Add or approve questions in the admin dashboard, then restart the quiz.",
      });
    }

    const seenQuestionIds = getSeenQuestionIds(previousSessions);
    const unseenRows = allRows.filter((row) => !seenQuestionIds.has(row.id));

    if (!unseenRows.length) {
      return exhaustedResponse({
        history,
        message: "You have finished every Board Prep question in the database. Restart the quiz to review, or add more questions from the admin dashboard.",
      });
    }

    const pickedIds = pickDailyQuestions(unseenRows).map((row) => row.id);

    const { data: newSession, error: insertError } = await supabase
      .from("board_sessions")
      .insert({
        user_id: user.id,
        session_date: today,
        question_ids: pickedIds,
        answers: {},
        completed: false,
      })
      .select("id, session_date, question_ids, answers, completed, score")
      .single();

    if (insertError) {
      console.error("board_sessions insert failed:", insertError);
      return NextResponse.json({ error: "Could not start session." }, { status: 500 });
    }

    session = newSession;
  }

  const { data: questionRows, error: questionError } = await supabase
    .from("board_questions")
    .select("id, question, option_a, option_b, option_c, option_d, correct_option, explanation, category, source_publication, difficulty")
    .in("id", session.question_ids || []);

  if (questionError) {
    console.error("board_questions daily load failed:", questionError);
    return NextResponse.json({ error: "Could not load Board Prep questions." }, { status: 500 });
  }

  const questions = (session.question_ids || [])
    .map((qid) => questionRows?.find((q) => q.id === qid))
    .filter(Boolean)
    .map(shapeQuestion);

  if (!session.completed && questions.length === 0) {
    return exhaustedResponse({
      session,
      history,
      questions,
      message: "You finished all available Board Prep questions. Restart the quiz to keep practicing.",
    });
  }

  const streak = computeStreak(history);
  const totalAnswered = Object.keys(session.answers || {}).length;

  return NextResponse.json(
    { session, questions, streak, history, totalAnswered, totalQuestions: questions.length || QUESTIONS_PER_SESSION, exhausted: false },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
