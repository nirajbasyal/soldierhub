import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles redirects from Supabase email links.
 *
 * Signup confirmation:
 *   /auth/callback?code=XYZ
 *   -> confirms the email, creates a session, then sends non-approved users to
 *      /pending-review with an email-verified message.
 *
 * Password reset or other explicit app flow:
 *   /auth/callback?code=XYZ&next=/reset-password
 *   -> confirms the code/session, then respects the safe local next path.
 */
function getSafeNext(searchParams) {
  const next = searchParams.get("next") || "/";

  // Only allow local app paths. Blocks protocol-relative redirects like //evil.com
  // and backslash variants that browsers may treat unpredictably.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }

  return next;
}

function buildPendingReviewPath({ email = "", name = "", status = "pending", found = true } = {}) {
  const params = new URLSearchParams({
    email,
    name,
    found: found ? "1" : "0",
    status: status || "pending",
    verified: "1",
  });

  return `/pending-review?${params.toString()}`;
}

async function getConfirmedProfileRedirect({ supabase, next }) {
  // Respect explicit flows such as password reset. Signup confirmation uses the
  // default next path and should land on the pending-review status page.
  if (next !== "/") return next;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/?auth_error=1";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, personal_email, full_name, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  const status = profile?.status || profile?.verification_status || "pending";
  const email = profile?.email || profile?.personal_email || user.email || "";
  const name = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "";

  if (status === "verified") return "/";

  return buildPendingReviewPath({
    email,
    name,
    status,
    found: true,
  });
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNext(searchParams);

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const redirectPath = await getConfirmedProfileRedirect({ supabase, next });
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    }
  }

  // Couldn't exchange — bounce home
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
