import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy runs on every matching request (formerly called "middleware" in
 * Next.js ≤15; renamed in Next.js 16 to clarify the network-boundary role).
 *
 * Responsibilities:
 *   1. Refresh the Supabase auth session cookie so server components
 *      see the user as logged in.
 *   2. Guard the /admin route — only admins can access it.
 *
 * If Supabase is not configured (demo mode) we just pass through.
 *
 * Note: per Next.js 16 docs, the proxy runtime is Node.js (not Edge).
 */
export async function proxy(request) {
  // If Supabase env vars aren't set, skip middleware entirely
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  const { response, supabase } = await updateSession(request);

  // ─── Guard /admin ────────────────────────────────────────────────────
  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin")) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *   - _next/static, _next/image (assets)
     *   - favicon.ico, robots.txt, sitemap.xml
     *   - common image extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
