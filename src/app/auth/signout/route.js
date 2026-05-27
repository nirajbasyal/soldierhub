import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearSupabaseCookies(request, response) {
  request.cookies.getAll().forEach((cookie) => {
    const name = cookie?.name || "";

    if (name.startsWith("sb-") || name.includes("supabase")) {
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        sameSite: "lax",
      });
    }
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const redirectTo = new URL("/", url.origin);

  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  const response = NextResponse.redirect(redirectTo);
  clearSupabaseCookies(request, response);

  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}
