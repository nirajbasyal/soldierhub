import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdmin } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set(["pending", "reviewed", "approved", "rejected"]);

function cleanText(value, max = 1000) {
  return String(value || "").trim().slice(0, max);
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
  const ctx = await adminContext(request, "admin-board-requests-get");
  if (ctx.response) return ctx.response;

  const { searchParams } = new URL(request.url);
  const status = cleanText(searchParams.get("status"), 20) || "pending";

  let query = ctx.supabase
    .from("board_question_requests")
    .select("id, user_id, request_type, question_id, category, message, suggested_question, suggested_answer, status, admin_notes, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message || "Could not load requests." }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const ctx = await adminContext(request, "admin-board-requests-patch");
  if (ctx.response) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const id = cleanText(body?.id, 80);
  const status = cleanText(body?.status, 20).toLowerCase();
  const admin_notes = cleanText(body?.admin_notes, 1000);

  if (!id) return NextResponse.json({ error: "Request id is required." }, { status: 400 });
  if (!STATUSES.has(status)) return NextResponse.json({ error: "Invalid request status." }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from("board_question_requests")
    .update({
      status,
      admin_notes,
      reviewed_by: ctx.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status, admin_notes, reviewed_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "Could not update request." }, { status: 500 });
  }

  return NextResponse.json({ data }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}

export async function DELETE(request) {
  const ctx = await adminContext(request, "admin-board-requests-delete");
  if (ctx.response) return ctx.response;

  const { searchParams } = new URL(request.url);
  const id = cleanText(searchParams.get("id"), 80);

  if (!id) return NextResponse.json({ error: "Request id is required." }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from("board_question_requests")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "Could not delete request." }, { status: 500 });
  }

  return NextResponse.json({ data }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}
