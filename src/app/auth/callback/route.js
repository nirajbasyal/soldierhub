import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect from Supabase email confirmation links.
 * URL shape: /auth/callback?code=XYZ&next=/some-path
 *
 * Exchanges the one-time code for a session cookie, then redirects to /next
 * (or "/" if no next param). The session cookie is set by the middleware.
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

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNext(searchParams);

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Couldn't exchange — bounce home
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
