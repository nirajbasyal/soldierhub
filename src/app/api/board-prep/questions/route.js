import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(request) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: "board-prep:questions",
    limit: 40,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Sign in to study Board Prep questions." }, { status: 401 });
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
    return NextResponse.json({ error: "Sign in to study Board Prep questions." }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") || 0);
  const shouldShuffle = url.searchParams.get("shuffle") === "1" || url.searchParams.get("shuffle") === "true";

  const { data, error } = await supabase
    .from("board_questions")
    .select("id, question, option_a, option_b, option_c, option_d, correct_option, explanation, category, source_publication, difficulty")
    .eq("active", true)
    .is("deleted_at", null)
    .order("category", { ascending: true })
    .order("question", { ascending: true })
    .limit(250);

  if (error) {
    console.error("board_questions study load failed:", error);
    return NextResponse.json({ error: "Could not load study questions." }, { status: 500 });
  }

  let rows = (data || []).map(shapeQuestion);

  if (shouldShuffle) rows = [...rows].sort(() => Math.random() - 0.5);
  if (Number.isFinite(limitParam) && limitParam > 0) rows = rows.slice(0, Math.min(limitParam, 50));

  return NextResponse.json(
    { data: rows, count: rows.length },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
