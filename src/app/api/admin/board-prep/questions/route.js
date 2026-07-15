import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdminService } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPTION_KEYS = new Set(["a", "b", "c", "d"]);
const DIFFICULTIES = new Set(["basic", "medium", "hard"]);
const QUESTION_TYPES = new Set(["multiple_choice", "flashcard"]);
const FLASHCARD_MARKER = "__FLASHCARD__";
const MAX_TEXT = 1200;
const MAX_BATCH = 100;

function cleanText(value, max = MAX_TEXT) {
  return String(value || "").trim().slice(0, max);
}

function cleanBool(value, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function slugify(value) {
  return cleanText(value, 90)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function resolveQuestionType(body) {
  const raw = cleanText(body?.question_type || body?.type, 30).toLowerCase();
  if (raw === "flashcard" || raw === "flash_card") return "flashcard";
  if (raw === "multiple_choice" || raw === "multiple-choice" || raw === "mcq") return "multiple_choice";
  if (body?.answer && !body?.option_b && !body?.option_c && !body?.option_d) return "flashcard";
  return "multiple_choice";
}

function buildPayload(body, userId, { partial = false, batchIndex = 0 } = {}) {
  const questionType = resolveQuestionType(body);
  const question = cleanText(body?.question, 500);
  const category = cleanText(body?.category, 80) || "General";
  const source_publication = cleanText(body?.source_publication || body?.publication, 120);
  const explanation = cleanText(body?.explanation, 900);
  const difficulty = cleanText(body?.difficulty, 20).toLowerCase() || "basic";

  if (!QUESTION_TYPES.has(questionType)) return { error: "Question type must be multiple_choice or flashcard." };
  if (!partial && !question) return { error: "Question is required." };
  if (!DIFFICULTIES.has(difficulty)) return { error: "Difficulty must be basic, medium, or hard." };

  let option_a = cleanText(body?.option_a, 300);
  let option_b = cleanText(body?.option_b, 300);
  let option_c = cleanText(body?.option_c, 300);
  let option_d = cleanText(body?.option_d, 300);
  let correct_option = cleanText(body?.correct_option, 1).toLowerCase() || "a";

  if (questionType === "flashcard") {
    const answer = cleanText(body?.answer || body?.correct_answer || body?.option_a, 500);
    if (!partial && !answer) return { error: "Flashcard answer is required." };
    option_a = answer || option_a;
    option_b = FLASHCARD_MARKER;
    option_c = FLASHCARD_MARKER;
    option_d = FLASHCARD_MARKER;
    correct_option = "a";
  } else {
    if (!partial && (!option_a || !option_b || !option_c || !option_d)) {
      return { error: "Multiple-choice questions require all four answer options." };
    }
    if (!OPTION_KEYS.has(correct_option)) return { error: "Correct option must be a, b, c, or d." };
  }

  const payload = {
    category,
    source_publication,
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_option,
    explanation,
    difficulty,
    active: cleanBool(body?.active, true),
    updated_by: userId,
  };

  if (!partial) {
    const baseSlug = slugify(body?.slug || `${category}-${source_publication}-${question}`) || "board-prep-question";
    payload.slug = `${baseSlug}-${Date.now()}${batchIndex ? `-${batchIndex}` : ""}`.slice(0, 120);
    payload.created_by = userId;
  }

  return { payload };
}

function shapeQuestion(row) {
  const isFlashcard = row?.option_b === FLASHCARD_MARKER && row?.option_c === FLASHCARD_MARKER && row?.option_d === FLASHCARD_MARKER;
  return {
    ...row,
    question_type: isFlashcard ? "flashcard" : "multiple_choice",
    answer: isFlashcard ? row.option_a : "",
  };
}

async function adminContext(request, prefix) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: prefix,
    limit: 80,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) return { response: rateLimitResponse(rateLimit) };

  const admin = await requireAdminService(request);
  if (!admin.ok) {
    return {
      response: NextResponse.json(
        { error: admin.error },
        { status: admin.status, headers: { ...rateLimit.headers, "Cache-Control": "no-store" } }
      ),
    };
  }

  return { ...admin, headers: rateLimit.headers };
}

const SELECT_FIELDS = "id, slug, category, source_publication, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, active, created_at, updated_at";

export async function GET(request) {
  const ctx = await adminContext(request, "admin-board-questions-get");
  if (ctx.response) return ctx.response;

  const { searchParams } = new URL(request.url);
  const q = cleanText(searchParams.get("q"), 100);
  const active = searchParams.get("active") || "all";

  let query = ctx.supabase
    .from("board_questions")
    .select(SELECT_FIELDS)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(250);

  if (active === "true") query = query.eq("active", true);
  if (active === "false") query = query.eq("active", false);
  if (q) {
    const escaped = q.replace(/[\\%_]/g, "\\$&");
    query = query.or(`question.ilike.%${escaped}%,category.ilike.%${escaped}%,source_publication.ilike.%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message || "Could not load questions." }, { status: 500 });
  }

  return NextResponse.json({ data: (data || []).map(shapeQuestion) }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const ctx = await adminContext(request, "admin-board-questions-post");
  if (ctx.response) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawItems = Array.isArray(body?.items) ? body.items : Array.isArray(body?.questions) ? body.questions : null;
  if (rawItems) {
    const items = rawItems.slice(0, MAX_BATCH);
    if (!items.length) return NextResponse.json({ error: "Batch upload needs at least one question." }, { status: 400 });

    const payloads = [];
    for (let i = 0; i < items.length; i += 1) {
      const { payload, error } = buildPayload(items[i], ctx.user.id, { batchIndex: i + 1 });
      if (error) return NextResponse.json({ error: `Item ${i + 1}: ${error}` }, { status: 400 });
      payloads.push(payload);
    }

    const { data, error: insertError } = await ctx.supabase
      .from("board_questions")
      .insert(payloads)
      .select(SELECT_FIELDS);

    if (insertError) {
      return NextResponse.json({ error: insertError.message || "Could not upload questions." }, { status: 500 });
    }

    return NextResponse.json({ data: (data || []).map(shapeQuestion), count: data?.length || 0 }, { status: 201, headers: { ...ctx.headers, "Cache-Control": "no-store" } });
  }

  const { payload, error } = buildPayload(body, ctx.user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { data, error: insertError } = await ctx.supabase
    .from("board_questions")
    .insert(payload)
    .select(SELECT_FIELDS)
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || "Could not add question." }, { status: 500 });
  }

  return NextResponse.json({ data: shapeQuestion(data) }, { status: 201, headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const ctx = await adminContext(request, "admin-board-questions-patch");
  if (ctx.response) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const id = cleanText(body?.id, 80);
  if (!id) return NextResponse.json({ error: "Question id is required." }, { status: 400 });

  const { payload, error } = buildPayload(body, ctx.user.id, { partial: true });
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { data, error: updateError } = await ctx.supabase
    .from("board_questions")
    .update(payload)
    .eq("id", id)
    .is("deleted_at", null)
    .select(SELECT_FIELDS)
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message || "Could not update question." }, { status: 500 });
  }

  return NextResponse.json({ data: shapeQuestion(data) }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}

export async function DELETE(request) {
  const ctx = await adminContext(request, "admin-board-questions-delete");
  if (ctx.response) return ctx.response;

  const { searchParams } = new URL(request.url);
  const id = cleanText(searchParams.get("id"), 80);
  if (!id) return NextResponse.json({ error: "Question id is required." }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from("board_questions")
    .update({ active: false, deleted_at: new Date().toISOString(), updated_by: ctx.user.id })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "Could not delete question." }, { status: 500 });
  }

  return NextResponse.json({ data }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}
