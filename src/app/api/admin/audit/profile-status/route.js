import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdminService } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function cleanLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function uniqueIds(values) {
  return [...new Set(values.filter(Boolean))];
}

async function loadProfileMap(supabase, ids) {
  if (!ids.length) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, personal_email")
    .in("id", ids);

  if (error) throw error;
  return new Map((data || []).map((profile) => [profile.id, profile]));
}

function publicProfileSummary(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    full_name: profile.full_name || null,
    email: profile.email || profile.personal_email || null,
  };
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "admin-audit-profile-status-ip",
    limit: 80,
    windowMs: 60 * 1000,
  });
  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const admin = await requireAdminService(request);
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code || "ADMIN_REQUIRED" },
      { status: admin.status, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = await checkRateLimit(request, {
    keyPrefix: `admin-audit-profile-status-user-${admin.user.id}`,
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });
  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let requestBody = {};
  try {
    requestBody = await request.json();
  } catch {
    requestBody = {};
  }

  const limit = cleanLimit(requestBody?.limit);

  const { data: logs, error } = await admin.supabase
    .from("profile_status_audit_log")
    .select("id, profile_id, actor_id, old_verification_status, new_verification_status, old_role, new_role, changed_at")
    .order("changed_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not load audit logs." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  try {
    const profileIds = uniqueIds((logs || []).flatMap((log) => [log.profile_id, log.actor_id]));
    const profiles = await loadProfileMap(admin.supabase, profileIds);

    const enrichedLogs = (logs || []).map((log) => ({
      ...log,
      profile: publicProfileSummary(profiles.get(log.profile_id)),
      actor: publicProfileSummary(profiles.get(log.actor_id)),
    }));

    return NextResponse.json(
      { data: enrichedLogs },
      { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  } catch (profileError) {
    return NextResponse.json(
      { error: profileError.message || "Could not load audit profile details." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }
}
