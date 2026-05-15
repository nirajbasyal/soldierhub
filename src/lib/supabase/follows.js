import { createClient } from "./client";

const FOLLOW_SUMMARY_CACHE_PREFIX = "soldierhub_follow_summary_v1:";
const FOLLOW_CONNECTIONS_CACHE_PREFIX = "soldierhub_follow_connections_v1:";
const FOLLOW_CACHE_MAX_AGE_MS = 1000 * 60 * 5;

function getFriendlyError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return null;

  const message = error.message || fallback;
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("relation") ||
    lowerMessage.includes("does not exist") ||
    lowerMessage.includes("function")
  ) {
    return {
      ...error,
      message:
        "Follow system is not ready yet. Please run the latest follower SQL in Supabase first.",
    };
  }

  return { ...error, message };
}

function normalizeFollowCountRow(row = {}) {
  return {
    followersCount: Number(row.followersCount ?? row.followers_count ?? row.follower_count ?? 0),
    followingCount: Number(row.followingCount ?? row.following_count ?? 0),
    isFollowing: Boolean(row.isFollowing ?? row.is_following ?? false),
  };
}

function cleanLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return 100;
  return Math.min(Math.floor(parsed), 100);
}

function safeCacheKey(prefix, ...parts) {
  return `${prefix}${parts.map((part) => encodeURIComponent(String(part || "none"))).join(":")}`;
}

function readCache(key, maxAgeMs = FOLLOW_CACHE_MAX_AGE_MS) {
  if (typeof window === "undefined" || !key) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);

    if (!savedAt || Date.now() - savedAt > maxAgeMs) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed?.value ?? null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeCache(key, value) {
  if (typeof window === "undefined" || !key) return;

  try {
    window.localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch {
    // Cache is only a speed boost. Ignore quota/private-mode errors safely.
  }
}

function removeCache(key) {
  if (typeof window === "undefined" || !key) return;
  window.localStorage.removeItem(key);
}

function followSummaryCacheKey(profileId, viewerId = null) {
  return safeCacheKey(FOLLOW_SUMMARY_CACHE_PREFIX, profileId, viewerId || "viewerless");
}

function followConnectionsCacheKey(type, profileId) {
  const normalizedType = type === "following" ? "following" : "followers";
  return safeCacheKey(FOLLOW_CONNECTIONS_CACHE_PREFIX, normalizedType, profileId);
}

export function getCachedFollowSummary(profileId, viewerId = null) {
  if (!profileId) return null;
  const cached = readCache(followSummaryCacheKey(profileId, viewerId));
  return cached ? normalizeFollowCountRow(cached) : null;
}

export function cacheFollowSummary(profileId, viewerId = null, summary = null) {
  if (!profileId || !summary) return;
  writeCache(followSummaryCacheKey(profileId, viewerId), normalizeFollowCountRow(summary));
}

export function updateCachedFollowSummary(profileId, viewerId = null, updater) {
  if (!profileId || typeof updater !== "function") return null;

  const key = followSummaryCacheKey(profileId, viewerId);
  const current = getCachedFollowSummary(profileId, viewerId) || {
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
  };
  const next = normalizeFollowCountRow(updater(current));
  writeCache(key, next);
  return next;
}

export function getCachedFollowConnections(type, profileId) {
  if (!profileId) return null;
  const cached = readCache(followConnectionsCacheKey(type, profileId));
  return Array.isArray(cached) ? cached : null;
}

export function cacheFollowConnections(type, profileId, items = []) {
  if (!profileId) return;
  writeCache(followConnectionsCacheKey(type, profileId), Array.isArray(items) ? items : []);
}

export function removeProfileFromCachedFollowing(profileId, targetProfileId) {
  if (!profileId || !targetProfileId) return;

  const key = followConnectionsCacheKey("following", profileId);
  const cached = getCachedFollowConnections("following", profileId);
  if (!cached) return;

  const next = cached.filter((item) => (item.profile?.id || item.id) !== targetProfileId);
  writeCache(key, next);
}

export function clearCachedFollowConnections(type, profileId) {
  if (!profileId) return;
  removeCache(followConnectionsCacheKey(type, profileId));
}

async function getCurrentUserId(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return { userId: null, error: error || { message: "Please log in again." } };
  }

  return { userId: user.id, error: null };
}

export async function getFollowSummary(profileId, viewerId = null, options = {}) {
  const cached = options.skipCache ? null : getCachedFollowSummary(profileId, viewerId);
  if (cached) {
    return { data: cached, error: null, cached: true };
  }

  const supabase = createClient();
  if (!supabase || !profileId) {
    return {
      data: { followersCount: 0, followingCount: 0, isFollowing: false },
      error: null,
    };
  }

  try {
    const [{ data: countRow, error: countError }, followingResult] = await Promise.all([
      supabase
        .from("profile_follow_counts")
        .select("profile_id, followers_count, following_count")
        .eq("profile_id", profileId)
        .maybeSingle(),
      viewerId && viewerId !== profileId
        ? supabase
            .from("profile_follows")
            .select("follower_id")
            .eq("follower_id", viewerId)
            .eq("following_id", profileId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (countError) {
      return {
        data: { followersCount: 0, followingCount: 0, isFollowing: false },
        error: getFriendlyError(countError, "Could not load follow counts."),
      };
    }

    if (followingResult?.error && followingResult.error.code !== "PGRST116") {
      return {
        data: { ...normalizeFollowCountRow(countRow), isFollowing: false },
        error: getFriendlyError(followingResult.error, "Could not check follow status."),
      };
    }

    const summary = {
      ...normalizeFollowCountRow(countRow),
      isFollowing: Boolean(followingResult?.data),
    };

    cacheFollowSummary(profileId, viewerId, summary);

    return {
      data: summary,
      error: null,
      cached: false,
    };
  } catch (error) {
    return {
      data: { followersCount: 0, followingCount: 0, isFollowing: false },
      error: getFriendlyError(error, "Could not load follow summary."),
    };
  }
}

export async function followUser(targetProfileId) {
  const supabase = createClient();
  if (!supabase || !targetProfileId) {
    return { data: null, error: { message: "Follow system is not available." } };
  }

  const { userId, error: userError } = await getCurrentUserId(supabase);
  if (userError || !userId) return { data: null, error: getFriendlyError(userError, "Please log in again.") };

  if (userId === targetProfileId) {
    return { data: null, error: { message: "You cannot follow your own profile." } };
  }

  const { data, error } = await supabase
    .from("profile_follows")
    .upsert(
      { follower_id: userId, following_id: targetProfileId },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true }
    )
    .select("follower_id, following_id, created_at")
    .maybeSingle();

  if (!error) {
    updateCachedFollowSummary(targetProfileId, userId, (current) => ({
      ...current,
      isFollowing: true,
      followersCount: current.isFollowing
        ? current.followersCount
        : current.followersCount + 1,
    }));
    updateCachedFollowSummary(userId, userId, (current) => ({
      ...current,
      followingCount: current.followingCount + 1,
    }));
    clearCachedFollowConnections("following", userId);
  }

  return { data, error: getFriendlyError(error, "Could not follow this member.") };
}

export async function unfollowUser(targetProfileId) {
  const supabase = createClient();
  if (!supabase || !targetProfileId) {
    return { error: { message: "Follow system is not available." } };
  }

  const { userId, error: userError } = await getCurrentUserId(supabase);
  if (userError || !userId) return { error: getFriendlyError(userError, "Please log in again.") };

  const { error } = await supabase
    .from("profile_follows")
    .delete()
    .eq("follower_id", userId)
    .eq("following_id", targetProfileId);

  if (!error) {
    updateCachedFollowSummary(targetProfileId, userId, (current) => ({
      ...current,
      isFollowing: false,
      followersCount: Math.max(0, current.followersCount - 1),
    }));
    updateCachedFollowSummary(userId, userId, (current) => ({
      ...current,
      followingCount: Math.max(0, current.followingCount - 1),
    }));
    removeProfileFromCachedFollowing(userId, targetProfileId);
  }

  return { error: getFriendlyError(error, "Could not unfollow this member.") };
}

export async function listFollowConnections(type, profileId, { limit = 100, skipCache = false } = {}) {
  const normalizedType = type === "following" ? "following" : "followers";
  const cached = skipCache ? null : getCachedFollowConnections(normalizedType, profileId);
  if (cached) {
    return { data: cached, error: null, cached: true };
  }

  const supabase = createClient();
  if (!supabase || !profileId) {
    return { data: [], error: { message: "Follow system is not available." } };
  }

  const { userId, error: userError } = await getCurrentUserId(supabase);
  if (userError || !userId) return { data: [], error: getFriendlyError(userError, "Please log in again.") };

  if (userId !== profileId) {
    return { data: [], error: { message: "You can only view your own followers and following list." } };
  }

  const safeLimit = cleanLimit(limit);

  const { data, error } = await supabase.rpc("list_my_follow_connections", {
    p_list_type: normalizedType,
    p_limit: safeLimit,
  });

  if (error) {
    return { data: [], error: getFriendlyError(error, "Could not load follow list.") };
  }

  const rows = (data || [])
    .map((row) => ({
      id: row.profile_id,
      created_at: row.followed_at,
      profile: {
        id: row.profile_id,
        full_name: row.full_name || "SoldierHub member",
        avatar_color: row.avatar_color || "#314A66",
        avatar_url: row.avatar_url || null,
        base: row.base || "Fort Bliss",
      },
    }))
    .filter((row) => row.profile?.id);

  cacheFollowConnections(normalizedType, profileId, rows);

  return {
    data: rows,
    error: null,
    cached: false,
  };
}
