import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function redirectPendingEmailLink(request) {
  const url = request.nextUrl;

  if (url.pathname !== "/pending-review" || !url.searchParams.has("code")) {
    return null;
  }

  const callbackUrl = url.clone();
  callbackUrl.pathname = "/auth/callback";
  return NextResponse.redirect(callbackUrl);
}

function isUuidLike(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function proxy(request) {
  const path = request.nextUrl.pathname;
  const pendingRedirect = redirectPendingEmailLink(request);
  if (pendingRedirect) return pendingRedirect;

  if (path === "/") {
    const sharedPostId = request.nextUrl.searchParams.get("post");

    if (sharedPostId && isUuidLike(sharedPostId)) {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = `/post/${sharedPostId}`;
      nextUrl.search = "";
      return NextResponse.redirect(nextUrl);
    }
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  const { response, supabase, userId } = await updateSession(request);

  if (path.startsWith("/admin")) {
    if (!supabase || !userId) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
