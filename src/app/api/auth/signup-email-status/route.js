import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireServiceRoleClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXISTING_ACCOUNT_MESSAGE =
  "This email already has an account. Please sign in or verify your email instead.";

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "signup-email-status-ip",
    limit: 25,
    windowMs: 10 * 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid signup check request." },
      { status: 400, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const email = cleanEmail(body?.email);

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const serviceRole = requireServiceRoleClient();
  if (!serviceRole.ok) {
    return NextResponse.json(
      { error: "Signup check is temporarily unavailable. Please try again." },
      { status: serviceRole.status, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: profile, error } = await serviceRole.supabase
    .from("profiles")
    .select("id, full_name, email, personal_email, verification_status")
    .or(`email.eq.${email},personal_email.eq.${email}`)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Could not verify this email. Please try again." },
      { status: 500, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { exists: false },
      { status: 200, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      exists: true,
      message: EXISTING_ACCOUNT_MESSAGE,
      status: profile.verification_status || "pending",
    },
    { status: 200, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
