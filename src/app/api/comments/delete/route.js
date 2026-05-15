import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy endpoint is disabled. Comment deletion now uses the delete_comment_safe Supabase RPC.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
