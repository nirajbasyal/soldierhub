import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNREAD_COUNT_CACHE_TTL_MS = 20 * 1000;
const unreadCountCache = new Map();

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

function createAuthedSupabaseClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function getProfileStatus(profile) {
  return profile?.status || profile?.verification_status || "pending";
}

function getCachedUnreadCount(userId) {
  const cached = unreadCountCache.get(userId);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    unreadCountCache.delete(userId);
    return null;
  }

  return cached;
}

function setCachedUnreadCount(userId, count) {
  const cachedAt = new Date().toISOString();

  unreadCountCache.set(userId, {
    count,
    cachedAt,
    expiresAt: Date.now() + UNREAD_COUNT_CACHE_TTL_MS,
  });

  return cachedAt;
}

function responseHeaders(rateLimitHeaders, cacheStatus) {
  return {
    ...rateLimitHeaders,
    "Cache-Control": "private, max-age=0, no-store",
    "X-SoldierHub-Cache": cacheStatus,
  };
}

export async function GET(request) {
  const ipRateLimit = checkRateLimit(request, {
    keyPrefix: "notifications-unread-count-ip",
    limit: 120,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { count: 0, error: "Please log in again before loading notifications." },
      { status: 401, headers: responseHeaders(ipRateLimit.headers, "MISS") }
    );
  }

  const supabase = createAuthedSupabaseClient(accessToken);

  if (!supabase) {
    return NextResponse.json(
      { count: 0, error: "Supabase is not configured." },
      { status: 503, headers: responseHeaders(ipRateLimit.headers, "MISS") }
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { count: 0, error: "Please log in again before loading notifications." },
      { status: 401, headers: responseHeaders(ipRateLimit.headers, "MISS") }
    );
  }

  const userRateLimit = checkRateLimit(request, {
    keyPrefix: `notifications-unread-count-user-${user.id}`,
    limit: 80,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  const cached = getCachedUnreadCount(user.id);

  if (cached) {
    return NextResponse.json(
      {
        count: cached.count,
        cachedAt: cached.cachedAt,
      },
      { headers: responseHeaders(userRateLimit.headers, "HIT") }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { count: 0, error: "Could not verify your profile. Please try again." },
      { status: 500, headers: responseHeaders(userRateLimit.headers, "MISS") }
    );
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return NextResponse.json(
      { count: 0 },
      { status: 200, headers: responseHeaders(userRateLimit.headers, "MISS") }
    );
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "estimated", head: true })
    .eq("recipient_user_id", user.id)
    .eq("read", false);

  if (error) {
    return NextResponse.json(
      { count: 0, error: error.message || "Could not load unread count." },
      { status: 500, headers: responseHeaders(userRateLimit.headers, "MISS") }
    );
  }

  const safeCount = count || 0;
  const cachedAt = setCachedUnreadCount(user.id, safeCount);

  return NextResponse.json(
    {
      count: safeCount,
      cachedAt,
    },
    { headers: responseHeaders(userRateLimit.headers, "MISS") }
  );
}
