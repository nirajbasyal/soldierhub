import { NextResponse } from "next/server";
import { requireAdminService } from "@/lib/server/adminAuth";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set(["delete", "restore"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPORTED_POST_SELECT =
  "id, author_id, author_name, author_color, category, body, anonymous, status, edited, created_at, updated_at, image_url, image_key, image_width, image_height, image_size, image_thumbnail_url, image_thumbnail_key, image_thumbnail_width, image_thumbnail_height, image_thumbnail_size, report_count";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function runPostAction({ supabase, action, postId }) {
  if (action === "restore") {
    return supabase.rpc("restore_reported_post", { p_post_id: postId });
  }

  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .select("id")
    .maybeSingle();

  return { data, error };
}

async function adminContext(request, prefix, { limit = 60 } = {}) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: `${prefix}-ip`,
    limit,
    windowMs: 60 * 1000,
  });
  if (!ipRateLimit.allowed) return { response: rateLimitResponse(ipRateLimit) };

  const admin = await requireAdminService(request);
  if (!admin.ok) {
    return {
      response: NextResponse.json(
        { error: admin.error, code: admin.code || "ADMIN_REQUIRED" },
        { status: admin.status, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
      ),
    };
  }

  const userRateLimit = await checkRateLimit(request, {
    keyPrefix: `${prefix}-user-${admin.user.id}`,
    limit: 80,
    windowMs: 10 * 60 * 1000,
  });
  if (!userRateLimit.allowed) return { response: rateLimitResponse(userRateLimit) };

  return { ...admin, headers: userRateLimit.headers };
}

export async function GET(request) {
  const ctx = await adminContext(request, "admin-posts-list", { limit: 80 });
  if (ctx.response) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("posts_with_meta")
    .select(REPORTED_POST_SELECT)
    .eq("status", "reported")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not load reported posts." },
      { status: 500, headers: { ...ctx.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data: data || [] },
    { status: 200, headers: { ...ctx.headers, "Cache-Control": "no-store" } }
  );
}

export async function POST(request) {
  const admin = await adminContext(request, "admin-posts-action");
  if (admin.response) return admin.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid admin post request." },
      { status: 400, headers: { ...admin.headers, "Cache-Control": "no-store" } }
    );
  }

  const action = cleanText(body?.action).toLowerCase();
  const postId = cleanText(body?.postId || body?.post_id);

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: "Invalid admin post action." },
      { status: 400, headers: { ...admin.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!UUID_PATTERN.test(postId)) {
    return NextResponse.json(
      { error: "A valid post id is required." },
      { status: 400, headers: { ...admin.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await runPostAction({
    supabase: admin.supabase,
    action,
    postId,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Admin post action failed." },
      { status: 500, headers: { ...admin.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data: Array.isArray(data) ? data[0] || null : data || { id: postId } },
    { status: 200, headers: { ...admin.headers, "Cache-Control": "no-store" } }
  );
}
