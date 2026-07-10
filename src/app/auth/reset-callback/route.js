import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Dedicated callback for Supabase password-recovery links.
 * Keeping recovery separate from signup confirmation prevents redirect query
 * parameters from being lost and guarantees a successful recovery session
 * lands on /reset-password.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/?password_reset_error=missing_code`);
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/?password_reset_error=unavailable`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/?password_reset_error=invalid_or_expired`);
  }

  return NextResponse.redirect(`${origin}/reset-password`);
}
