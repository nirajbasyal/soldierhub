import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function isSupabaseAuthCookie(name = "") {
  return name.startsWith("sb-") && name.includes("auth-token");
}

function hasSupabaseAuthCookie(request) {
  return request.cookies.getAll().some(({ name }) => isSupabaseAuthCookie(name));
}

function isExpiredSessionError(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "session_not_found" ||
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found") ||
    message.includes("auth session missing")
  );
}

function clearSupabaseAuthCookies(request, response) {
  request.cookies.getAll().forEach(({ name }) => {
    if (!isSupabaseAuthCookie(name)) return;
    request.cookies.delete(name);
    response.cookies.set(name, "", {
      path: "/",
      expires: new Date(0),
      maxAge: 0,
      sameSite: "lax",
    });
  });
}

/**
 * Middleware Supabase client. Refreshes the session on every request so the
 * cookies stay valid, then returns a NextResponse with the updated cookies.
 *
 * Why this exists: server-side Supabase sessions are stored in cookies.
 * Without periodic refresh, the user appears logged out on Server Components
 * even though their browser session is still alive.
 */
export async function updateSession(request) {
  let response = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { response, supabase: null, userId: null };
  }

  // Anonymous public traffic does not need an Auth API round trip. This keeps
  // static pages inexpensive under load while authenticated browsers continue
  // to refresh and validate their cookie-backed session.
  if (!hasSupabaseAuthCookie(request)) {
    return { response, supabase: null, userId: null };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let userId = null;

  try {
    if (typeof supabase.auth.getClaims === "function") {
      const { data, error } = await supabase.auth.getClaims();
      if (error) throw error;
      userId = data?.claims?.sub || null;
    } else {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      userId = data?.user?.id || null;
    }
  } catch (error) {
    if (isExpiredSessionError(error)) {
      clearSupabaseAuthCookies(request, response);
      response.headers.set("X-SoldierHub-Session-Reset", "1");
      return { response, supabase, userId: null };
    }

    console.error(
      JSON.stringify({
        level: "error",
        message: "Supabase session validation failed",
        code: error?.code || null,
      })
    );
    return { response, supabase, userId: null };
  }

  response.headers.set("Cache-Control", "private, no-store");
  return { response, supabase, userId };
}
