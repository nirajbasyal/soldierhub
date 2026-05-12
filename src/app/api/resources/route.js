import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESOURCE_CACHE_TTL_MS = 60 * 1000;
const RESOURCE_SELECT =
  "id, section, title, description, link, display_order, created_at, updated_at";

let resourcesCache = {
  data: null,
  expiresAt: 0,
  cachedAt: null,
};

function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function responseHeaders(cacheStatus) {
  return {
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    "X-SoldierHub-Cache": cacheStatus,
  };
}

function getCachedResources() {
  if (!resourcesCache.data) return null;
  if (Date.now() > resourcesCache.expiresAt) return null;

  return {
    data: resourcesCache.data,
    cachedAt: resourcesCache.cachedAt,
  };
}

function setCachedResources(data) {
  resourcesCache = {
    data,
    expiresAt: Date.now() + RESOURCE_CACHE_TTL_MS,
    cachedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const cached = getCachedResources();

  if (cached) {
    return NextResponse.json(
      {
        data: cached.data,
        cachedAt: cached.cachedAt,
      },
      { headers: responseHeaders("HIT") }
    );
  }

  const supabase = createPublicSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { data: [], error: "Supabase is not configured." },
      { status: 503, headers: responseHeaders("MISS") }
    );
  }

  const { data, error } = await supabase
    .from("resources")
    .select(RESOURCE_SELECT)
    .order("section", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (resourcesCache.data) {
      return NextResponse.json(
        {
          data: resourcesCache.data,
          cachedAt: resourcesCache.cachedAt,
          warning: "Showing cached resources because fresh resources are temporarily unavailable.",
        },
        { headers: responseHeaders("STALE") }
      );
    }

    return NextResponse.json(
      { data: [], error: error.message || "Could not load resources." },
      { status: 500, headers: responseHeaders("MISS") }
    );
  }

  const resources = data || [];
  setCachedResources(resources);

  return NextResponse.json(
    {
      data: resources,
      cachedAt: resourcesCache.cachedAt,
    },
    { headers: responseHeaders("MISS") }
  );
}
