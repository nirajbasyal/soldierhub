import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdmin } from "@/lib/server/adminAuth";
import { getAdminDbClient, getAdminDbClientMode } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set([
  "verify",
  "reject",
  "revoke",
  "verify_by_email",
  "revoke_by_email",
]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function runAdminAction({ supabase, action, profileId, email }) {
  if (action === "verify") {
    return supabase
      .from("profiles")
      .update({ verification_status: "verified" })
      .eq("id", profileId)
      .select("id, full_name, email, verification_status")
      .maybeSingle();
  }

  if (action === "reject") {
    return supabase.rpc("admin_reject_profile", { p_profile_id: profileId });
  }

  if (action === "revoke") {
    return supabase.rpc("admin_revoke_profile", { p_profile_id: profileId });
  }

  if (action === "verify_by_email") {
    return supabase.rpc("admin_verify_profile_by_email", { p_email: email });
  }

  return supabase.rpc("admin_revoke_profile_by_email", { p_email: email });
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

  const adminDb = getAdminDbClient(admin.supabase);
  const adminDbMode = getAdminDbClientMode();

  const { data, error } = await runAdminAction({
    supabase: adminDb,
    action,
    profileId,
    email,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Admin action failed." },
      {
        status: 500,
        headers: {
          ...userRateLimit.headers,
          "Cache-Control": "no-store",
          "X-SoldierHub-Admin-DB": adminDbMode,
        },
      }
    );
  }

  return NextResponse.json(
    { data: Array.isArray(data) ? data[0] || null : data || null },
    {
      status: 200,
      headers: {
        ...userRateLimit.headers,
        "Cache-Control": "no-store",
        "X-SoldierHub-Admin-DB": adminDbMode,
      },
    }
  );
}
