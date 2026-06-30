import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function redirectPendingEmailLink(request) {
  const url = request.nextUrl;

  if (url.pathname !== "/pending-review" || !url.searchParams.has("code")) {
    return null;
  }

  const callbackUrl = url.clone();
  callbackUrl.pathname = "/auth/callback";
  return NextResponse.redirect(callbackUrl);
}

export async function updateSession(request) {
  const pendingRedirect = redirectPendingEmailLink(request);
  if (pendingRedirect) return pendingRedirect;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers = {}) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers || {}).forEach(([key, value]) => {
            if (value) response.headers.set(key, value);
          });
        },
      },
    }
  );

  if (typeof supabase.auth.getClaims === "function") {
    await supabase.auth.getClaims();
  } else {
    await supabase.auth.getUser();
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
