import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdmin } from "@/lib/server/adminAuth";
import { requireServiceRoleClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set(["verify", "reject", "revoke", "verify_by_email", "revoke_by_email"]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function profileSelect() {
  return "id, full_name, email, personal_email, verification_status, role";
}

function statusForAction(action) {
  if (action === "verify" || action === "verify_by_email") return "verified";
  if (action === "reject") return "rejected";
  return "revoked";
}

async function updateProfileStatusById({ supabase, profileId, status }) {
  return supabase
    .from("profiles")
    .update({ verification_status: status })
    .eq("id", profileId)
    .select(profileSelect())
    .maybeSingle();
}

async function updateProfileStatusByEmail({ supabase, email, status }) {
  const primary = await supabase
    .from("profiles")
    .update({ verification_status: status })
    .eq("email", email)
    .select(profileSelect())
    .maybeSingle();

  if (primary.data || primary.error) return primary;

  return supabase
    .from("profiles")
    .update({ verification_status: status })
    .eq("personal_email", email)
    .select(profileSelect())
    .maybeSingle();
}

async function runAdminAction({ supabase, action, profileId, email }) {
  const status = statusForAction(action);

  if (["verify", "reject", "revoke"].includes(action)) {
    return updateProfileStatusById({ supabase, profileId, status });
  }

  return updateProfileStatusByEmail({ supabase, email, status });
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "admin-profiles-action-ip",
    limit: 60,
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
    keyPrefix: `admin-profiles-action-user-${admin.user.id}`,
    limit: 80,
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
      { error: "Invalid admin action request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const action = cleanText(requestBody?.action).toLowerCase();
  const profileId = cleanText(requestBody?.profileId || requestBody?.profile_id);
  const email = cleanText(requestBody?.email).toLowerCase();

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: "Invalid admin action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }
  if (["verify", "reject", "revoke"].includes(action) && !profileId) {
    return NextResponse.json(
      { error: "Profile id is required for this admin action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }
  if (["verify_by_email", "revoke_by_email"].includes(action) && !email) {
    return NextResponse.json(
      { error: "Email is required for this admin action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await runAdminAction({
    supabase: db.supabase,
    action,
    profileId,
    email,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Admin action failed." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data: data || null },
    { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
