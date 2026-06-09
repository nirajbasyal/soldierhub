import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATE_SELECT = "id, name, label, note, hours, status_type, open_time, close_time, days, custom_status_text, custom_is_open, is_active, display_order, created_at, updated_at";

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

function createGateSupabaseClient(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = getBearerToken(request);

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
  });
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-SoldierHub-Cache": "BYPASS",
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";
  const supabase = createGateSupabaseClient(request);

  if (!supabase) {
    return NextResponse.json(
      { data: [], error: "Supabase is not configured." },
      { status: 503, headers: responseHeaders() }
    );
  }

  let query = supabase
    .from("gates")
    .select(GATE_SELECT)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { data: [], error: error.message || "Could not load gates." },
      { status: 500, headers: responseHeaders() }
    );
  }

  return NextResponse.json(
    {
      data: data || [],
      cachedAt: null,
    },
    { headers: responseHeaders() }
  );
}
