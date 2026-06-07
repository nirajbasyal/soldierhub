import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { getBearerToken, createAuthedSupabaseClient } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["add", "update", "remove"]);

function cleanText(value, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

export async function POST(request) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: "board-prep-user-request",
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Sign in to send a Board Prep request." }, { status: 401 });
  }

  const supabase = createAuthedSupabaseClient(accessToken);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Sign in to send a Board Prep request." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const request_type = cleanText(body?.request_type, 20).toLowerCase();
  const question_id = cleanText(body?.question_id, 80) || null;
  const category = cleanText(body?.category, 80) || null;
  const message = cleanText(body?.message, 1200);
  const suggested_question = cleanText(body?.suggested_question, 500) || null;
  const suggested_answer = cleanText(body?.suggested_answer, 900) || null;

  if (!TYPES.has(request_type)) {
    return NextResponse.json({ error: "Choose add, update, or remove." }, { status: 400 });
  }

  if (!message && !suggested_question && !suggested_answer) {
    return NextResponse.json({ error: "Add a short note so admins know what to change." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("board_question_requests")
    .insert({
      user_id: user.id,
      request_type,
      question_id,
      category,
      message: message || "User requested a Board Prep content update.",
      suggested_question,
      suggested_answer,
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "Could not send request." }, { status: 500 });
  }

  return NextResponse.json(
    { data },
    { status: 201, headers: { ...rateLimit.headers, "Cache-Control": "no-store" } }
  );
}
