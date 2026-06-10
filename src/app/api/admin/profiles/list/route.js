import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdmin } from "@/lib/server/adminAuth";
import { requireServiceRoleClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_PROFILE_FIELDS =
  "id, full_name, email, personal_email, phone, bio, avatar_color, avatar_url, role, verification_status, base, created_at, updated_at";
const ALLOWED_QUEUES = new Set(["pending", "verified", "blocked"]);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

async function listAdminProfiles({ supabase, queue, limit }) {
  const rpcResult = await supabase.rpc("admin_list_profiles", {
    p_queue: queue,
    p_limit: limit,
  });

  if (!rpcResult.error) return { data: rpcResult.data || [], error: null };

  if (queue === "blocked") {
    const fallback = await supabase
      .from("profiles")
      .select(ADMIN_PROFILE_FIELDS)
      .in("verification_status", ["rejected", "revoked"])
      .order("created_at", { ascending: false })
      .limit(limit);

    return { data: fallback.data || [], error: fallback.error };
  }

  const fallback = await supabase
    .from("profiles")
    .select(ADMIN_PROFILE_FIELDS)
    .eq("verification_status", queue)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data: fallback.data || [], error: fallback.error };
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "admin-profiles-list-ip",
    limit: 80,
    windowMs: 60 * 1000,
  });
  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code || "ADMIN_REQUIRED" },
      { status: admin.status, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = await checkRateLimit(request, {
    keyPrefix: `admin-profiles-list-user-${admin.user.id}`,
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });
  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  const db = requireServiceRoleClient();
  if (!db.ok) {
    return NextResponse.json(
      { error: db.error, code: "ADMIN_DB_REQUIRED" },
      { status: db.status, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid admin profile list request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const queue = cleanText(requestBody?.queue).toLowerCase();
  const limit = cleanLimit(requestBody?.limit);

  if (!ALLOWED_QUEUES.has(queue)) {
    return NextResponse.json(
      { error: "Invalid admin profile queue." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await listAdminProfiles({ supabase: db.supabase, queue, limit });
  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not load admin profiles." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data: data || [] },
    { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
