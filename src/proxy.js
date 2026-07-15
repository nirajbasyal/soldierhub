import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { buildContentSecurityPolicy } from "@/lib/security/contentSecurityPolicy.mjs";

function secureRequest(request) {
  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = buildContentSecurityPolicy({ nonce });
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  return {
    requestHeaders,
    secureResponse(response) {
      response.headers.set("Content-Security-Policy", contentSecurityPolicy);
      return response;
    },
  };
}

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
  const { requestHeaders, secureResponse } = secureRequest(request);
  const path = request.nextUrl.pathname;
  const pendingRedirect = redirectPendingEmailLink(request);
  if (pendingRedirect) return secureResponse(pendingRedirect);

  if (path === "/") {
    const sharedPostId = request.nextUrl.searchParams.get("post");

    if (sharedPostId && isUuidLike(sharedPostId)) {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = `/post/${sharedPostId}`;
      nextUrl.search = "";
      return secureResponse(NextResponse.redirect(nextUrl));
    }
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return secureResponse(
      NextResponse.next({ request: { headers: requestHeaders } })
    );
  }

  const { response, supabase, userId } = await updateSession(request, {
    requestHeaders,
  });

  if (path.startsWith("/admin")) {
    if (!supabase || !userId) {
      return secureResponse(NextResponse.redirect(new URL("/", request.url)));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (profile?.role !== "admin") {
      return secureResponse(NextResponse.redirect(new URL("/", request.url)));
    }
  }

  return secureResponse(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
