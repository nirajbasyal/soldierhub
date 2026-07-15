import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdminService } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CATEGORY_LENGTH = 80;
const MAX_RENAMES = 50;

function cleanCategory(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, MAX_CATEGORY_LENGTH);
}

async function adminContext(request, prefix) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: prefix,
    limit: 40,
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

function summarizeCategories(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const name = cleanCategory(row?.category) || "General";
    const current = map.get(name) || { name, count: 0, activeCount: 0 };
    current.count += 1;
    if (row?.active) current.activeCount += 1;
    map.set(name, current);
  });

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET(request) {
  const ctx = await adminContext(request, "admin-board-categories-get");
  if (ctx.response) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("board_questions")
    .select("category, active")
    .is("deleted_at", null)
    .order("category", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message || "Could not load Board Prep categories." }, { status: 500 });
  }

  return NextResponse.json({ data: summarizeCategories(data || []) }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const ctx = await adminContext(request, "admin-board-categories-patch");
  if (ctx.response) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawRenames = Array.isArray(body?.renames) ? body.renames : Array.isArray(body?.items) ? body.items : [];
  if (!rawRenames.length) {
    return NextResponse.json({ error: "At least one category rename is required." }, { status: 400 });
  }

  const renames = rawRenames
    .slice(0, MAX_RENAMES)
    .map((item) => ({ from: cleanCategory(item?.from || item?.oldName || item?.old_name), to: cleanCategory(item?.to || item?.newName || item?.new_name) }))
    .filter((item) => item.from && item.to && item.from !== item.to);

  if (!renames.length) {
    return NextResponse.json({ error: "No category name changes were found." }, { status: 400 });
  }

  const fromSet = new Set();
  for (const item of renames) {
    if (fromSet.has(item.from)) {
      return NextResponse.json({ error: `Duplicate rename source: ${item.from}` }, { status: 400 });
    }
    fromSet.add(item.from);
  }

  const changedSources = new Set(renames.map((item) => item.from));
  const cascadingRename = renames.find((item) => changedSources.has(item.to));
  if (cascadingRename) {
    return NextResponse.json(
      {
        error: `Cannot rename "${cascadingRename.from}" to "${cascadingRename.to}" in the same save because "${cascadingRename.to}" is also being renamed. Save one step first to avoid accidental cascading changes.`,
      },
      { status: 400 }
    );
  }

  const results = [];

  for (const item of renames) {
    const { data, error } = await ctx.supabase
      .from("board_questions")
      .update({ category: item.to, updated_by: ctx.user.id })
      .eq("category", item.from)
      .is("deleted_at", null)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message || `Could not rename ${item.from}.` }, { status: 500 });
    }

    results.push({ from: item.from, to: item.to, updatedCount: data?.length || 0 });
  }

  return NextResponse.json({ data: results, count: results.reduce((sum, item) => sum + item.updatedCount, 0) }, { headers: { ...ctx.headers, "Cache-Control": "no-store" } });
}
