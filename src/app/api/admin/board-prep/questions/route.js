import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdmin } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPTION_KEYS = new Set(["a", "b", "c", "d"]);
const DIFFICULTIES = new Set(["basic", "medium", "hard"]);
const MAX_TEXT = 1200;

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

function buildPayload(body, userId, { partial = false } = {}) {
  const question = cleanText(body?.question, 500);
  const option_a = cleanText(body?.option_a, 300);
  const option_b = cleanText(body?.option_b, 300);
  const option_c = cleanText(body?.option_c, 300);
  const option_d = cleanText(body?.option_d, 300);
  const correct_option = cleanText(body?.correct_option, 1).toLowerCase();
  const category = cleanText(body?.category, 80) || "General";
  const source_publication = cleanText(body?.source_publication, 120);
  const explanation = cleanText(body?.explanation, 900);
  const difficulty = cleanText(body?.difficulty, 20).toLowerCase() || "basic";

  if (!partial) {
    if (!question || !option_a || !option_b || !option_c || !option_d) {
      return { error: "Question and all four answer options are required." };
    }
    if (!OPTION_KEYS.has(correct_option)) return { error: "Correct option must be a, b, c, or d." };
    if (!DIFFICULTIES.has(difficulty)) return { error: "Difficulty must be basic, medium, or hard." };
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
    difficulty: DIFFICULTIES.has(difficulty) ? difficulty : "basic",
    active: cleanBool(body?.active, true),
    updated_by: userId,
  };

  if (!partial) {
    payload.slug = slugify(body?.slug || `${category}-${source_publication}-${question}`);
    payload.created_by = userId;
  }

  return { payload };
}

async function adminContext(request, prefix) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: prefix,
    limit: 80,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) return { response: rateLimitResponse(rateLimit) };

  const admin = await requireAdmin(request);
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

export async function GET(request) {
  const ctx = await adminContext(request, "admin-board-questions-get");
  if (ctx.response) return ctx.response;

  const { searchParams } = new URL(request.url);
  const q = cleanText(searchParams.get("q"), 100);
  const active = searchParams.get("active") || "all";

  let query = ctx.supabase
    .from("board_questions")
    .select("id, slug, category, source_publication, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, active, created_at, updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);

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

  return NextResponse.json({ data: data || [] }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
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

  const { payload, error } = buildPayload(body, ctx.user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { data, error: insertError } = await ctx.supabase
    .from("board_questions")
    .insert(payload)
    .select("id, slug, category, source_publication, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, active, created_at, updated_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || "Could not add question." }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201, headers: { ...ctx.headers, "Cache-Control": "no-store" } });
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
    .select("id, slug, category, source_publication, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, active, created_at, updated_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message || "Could not update question." }, { status: 500 });
  }

  return NextResponse.json({ data }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
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
