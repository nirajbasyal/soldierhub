import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdminService } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
}

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanBool(value, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
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

const SELECT_FIELDS = "id, memory_key, title, summary, body, display_order, active, updated_at";

export async function GET(request) {
  const ctx = await adminContext(request, "admin-board-memory-get");
  if (ctx.response) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("board_memory_items")
    .select(SELECT_FIELDS)
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message || "Could not load memory guide." }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const ctx = await adminContext(request, "admin-board-memory-patch");
  if (ctx.response) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const id = cleanText(body?.id, 80);
  if (!id) return NextResponse.json({ error: "Memory item id is required." }, { status: 400 });

  const title = cleanText(body?.title, 120);
  const summary = cleanText(body?.summary, 240);
  const itemBody = cleanText(body?.body, 5000);

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!itemBody) return NextResponse.json({ error: "Body is required." }, { status: 400 });

  const payload = {
    title,
    summary,
    body: itemBody,
    display_order: cleanNumber(body?.display_order, 0),
    active: cleanBool(body?.active, true),
    updated_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await ctx.supabase
    .from("board_memory_items")
    .update(payload)
    .eq("id", id)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "Could not update memory guide." }, { status: 500 });
  }

  return NextResponse.json({ data }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}
