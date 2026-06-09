import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATE_CACHE_TTL_MS = 60 * 1000;
const GATE_SELECT = "id, name, label, note, hours, status_type, open_time, close_time, days, custom_status_text, custom_is_open, is_active, display_order, created_at, updated_at";

let gatesCache = {
  data: null,
  includeInactive: false,
  expiresAt: 0,
  cachedAt: null,
};

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

function responseHeaders(cacheStatus) {
  return {
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    "X-SoldierHub-Cache": cacheStatus,
  };
}

function getCachedGates(includeInactive) {
  // Admin views must always read fresh data so inactive gates and edits appear immediately.
  if (includeInactive) return null;
  if (!gatesCache.data) return null;
  if (gatesCache.includeInactive !== includeInactive) return null;
  if (Date.now() > gatesCache.expiresAt) return null;

  return {
    data: gatesCache.data,
    cachedAt: gatesCache.cachedAt,
  };
}

function setCachedGates(data, includeInactive) {
  if (includeInactive) return;

  gatesCache = {
    data,
    includeInactive,
    expiresAt: Date.now() + GATE_CACHE_TTL_MS,
    cachedAt: new Date().toISOString(),
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";
  const cached = getCachedGates(includeInactive);

  if (cached) {
    return NextResponse.json(
      {
        data: cached.data,
        cachedAt: cached.cachedAt,
      },
      { headers: responseHeaders("HIT") }
    );
  }

  const supabase = createGateSupabaseClient(request);

  if (!supabase) {
    return NextResponse.json(
      { data: [], error: "Supabase is not configured." },
      { status: 503, headers: responseHeaders("MISS") }
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
    if (!includeInactive && gatesCache.data) {
      return NextResponse.json(
        {
          data: gatesCache.data,
          cachedAt: gatesCache.cachedAt,
          warning: "Showing cached gates because fresh gate data is temporarily unavailable.",
        },
        { headers: responseHeaders("STALE") }
      );
    }

    return NextResponse.json(
      { data: [], error: error.message || "Could not load gates." },
      { status: 500, headers: responseHeaders("MISS") }
    );
  }

  const gates = data || [];
  setCachedGates(gates, includeInactive);

  return NextResponse.json(
    {
      data: gates,
      cachedAt: gatesCache.cachedAt,
    },
    { headers: responseHeaders("MISS") }
  );
}
