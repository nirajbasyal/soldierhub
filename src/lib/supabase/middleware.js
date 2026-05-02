import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

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
    return response;
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

  // Touching the user keeps the session fresh.
  await supabase.auth.getUser();

  return { response, supabase };
}
