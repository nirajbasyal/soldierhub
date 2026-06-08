import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLASHCARD_MARKER = "__FLASHCARD__";
const MAX_STUDY_QUESTIONS = 250;
const MAX_REVIEW_QUESTIONS = 50;

function noStoreHeaders(extra = {}) {
  return { "Cache-Control": "no-store", Vary: "Authorization, Cookie", ...extra };
}

function jsonNoStore(body, init = {}) {
  return NextResponse.json(body, { ...init, headers: noStoreHeaders(init.headers || {}) });
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
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
  const accessToken = getBearerToken(request);

  if (accessToken) {
    const bearerSupabase = createAuthedClient(accessToken);
    if (bearerSupabase) {
      const {
        data: { user },
        error,
      } = await bearerSupabase.auth.getUser(accessToken);

      if (!error && user) return { supabase: bearerSupabase, user };
    }
  }

  const cookieSupabase = await createServerSupabaseClient();
  if (cookieSupabase) {
    const {
      data: { user },
      error,
    } = await cookieSupabase.auth.getUser();

    if (!error && user) return { supabase: cookieSupabase, user };
  }

  return { supabase: null, user: null };
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

  const { supabase, user } = await getRequestUserContext(request);
  if (!supabase || !user) {
    return jsonNoStore({ error: "Sign in to study Board Prep questions." }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") || 0);
  const shouldShuffle = url.searchParams.get("shuffle") === "1" || url.searchParams.get("shuffle") === "true";
  const dbLimit = shouldShuffle
    ? MAX_STUDY_QUESTIONS
    : Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(MAX_REVIEW_QUESTIONS, Math.max(limitParam * 8, limitParam))
      : MAX_STUDY_QUESTIONS;

  const { data, error } = await supabase
    .from("board_questions")
    .select("id, question, option_a, option_b, option_c, option_d, correct_option, explanation, category, source_publication, difficulty")
    .eq("active", true)
    .is("deleted_at", null)
    .order("category", { ascending: true })
    .order("question", { ascending: true })
    .limit(dbLimit);

  if (error) {
    console.error("board_questions study load failed:", error);
    return jsonNoStore({ error: "Could not load study questions." }, { status: 500 });
  }

  let rows = (data || []).map(shapeQuestion);

  if (shouldShuffle) rows = [...rows].sort(() => Math.random() - 0.5);
  if (Number.isFinite(limitParam) && limitParam > 0) rows = rows.slice(0, Math.min(limitParam, MAX_REVIEW_QUESTIONS));

  return jsonNoStore(
    { data: rows, count: rows.length },
    { status: 200, headers: rateLimit.headers }
  );
}
