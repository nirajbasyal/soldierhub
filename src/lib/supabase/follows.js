import { createClient } from "./client";

const FOLLOW_SUMMARY_CACHE_PREFIX = "soldierhub_follow_summary_v2:";
const FOLLOW_CONNECTIONS_CACHE_PREFIX = "soldierhub_follow_connections_v2:";
const FOLLOW_CACHE_MAX_AGE_MS = 1000 * 60 * 5;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidProfileId(value) {
  return UUID_PATTERN.test(String(value || "").trim());
}

export function getConnectionProfileId(item = {}) {
  const profileId =
    item?.profile?.id ||
    item?.profile_id ||
    item?.id ||
    item?.following_id ||
    item?.follower_id ||
    null;

  return isValidProfileId(profileId) ? String(profileId).trim() : "";
}

function getFriendlyError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return null;

  const message = error.message || fallback;
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("relation") ||
    lowerMessage.includes("does not exist") ||
    lowerMessage.includes("function") ||
    lowerMessage.includes("profile_follows") ||
    lowerMessage.includes("profile_follow_counts") ||
    lowerMessage.includes("list_my_follow_connections")
  ) {
    return {
      ...error,
      message:
        "Follow system is not ready yet. Please run the latest follower SQL in Supabase first.",
    };
  }

  if (
    lowerMessage.includes("profile was not identified") ||
    lowerMessage.includes("invalid input syntax for type uuid")
  ) {
    return {
      ...error,
      message: "This profile link needs to refresh. Please reload the page and try again.",
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

function normalizeConnectionRow(row = {}) {
  const profileId = getConnectionProfileId(row);
  if (!profileId) return null;

  const profile = row.profile || row.profiles || row.author || row.user || {};

  return {
    ...row,
    id: profileId,
    profile_id: profileId,
    profile: {
      id: profileId,
      full_name: profile.full_name || row.full_name || "SoldierHub member",
      avatar_color: profile.avatar_color || row.avatar_color || "#314A66",
      avatar_url: profile.avatar_url || row.avatar_url || null,
      base: profile.base || row.base || "Fort Bliss",
    },
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

async function getCurrentSession(supabase) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user?.id) {
    return { session: null, error: error || { message: "Please log in again." } };
  }

  return { session, error: null };
}

async function getAccessTokenForApi(supabase) {
  const { session, error } = await getCurrentSession(supabase);

  if (error || !session?.access_token) {
    return { accessToken: null, error: error || { message: "Please log in again." } };
  }

  return { accessToken, error: null };
}

async function getCurrentUserId(supabase) {
  const { session, error } = await getCurrentSession(supabase);

  if (error || !session?.user?.id) {
    return { userId: null, error: error || { message: "Please log in again." } };
  }

  return { userId: session.user.id, error: null };
}

async function postJsonToApi(path, accessToken, payload, fallbackMessage) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    return {
      data: null,
      error: {
        message:
          result?.error ||
          (response.status === 429
            ? "You are updating follows too quickly. Please try again shortly."
            : fallbackMessage),
      },
    };
  }

  return { data: result || null, error: null };
}

export function getCachedFollowSummary(profileId, viewerId = null) {
  if (!isValidProfileId(profileId)) return null;
  const cached = readCache(followSummaryCacheKey(profileId, viewerId));
  return cached ? normalizeFollowCountRow(cached) : null;
}

export function cacheFollowSummary(profileId, viewerId = null, summary = null) {
  if (!isValidProfileId(profileId) || !summary) return;
  writeCache(followSummaryCacheKey(profileId, viewerId), normalizeFollowCountRow(summary));
}

export function updateCachedFollowSummary(profileId, viewerId = null, updater) {
  if (!isValidProfileId(profileId) || typeof updater !== "function") return null;

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
  if (!isValidProfileId(profileId)) return null;
  const cached = readCache(followConnectionsCacheKey(type, profileId));
  if (!Array.isArray(cached)) return null;

  const normalizedRows = cached.map(normalizeConnectionRow).filter(Boolean);
  return normalizedRows.length > 0 ? normalizedRows : null;
}

export function cacheFollowConnections(type, profileId, items = []) {
  if (!isValidProfileId(profileId)) return;
  const normalizedRows = (Array.isArray(items) ? items : [])
    .map(normalizeConnectionRow)
    .filter(Boolean);
  writeCache(followConnectionsCacheKey(type, profileId), normalizedRows);
}

export function removeProfileFromCachedFollowing(profileId, targetProfileId) {
  if (!isValidProfileId(profileId) || !isValidProfileId(targetProfileId)) return;

  const key = followConnectionsCacheKey("following", profileId);
  const cached = getCachedFollowConnections("following", profileId);
  if (!cached) return;

  const next = cached.filter((item) => getConnectionProfileId(item) !== targetProfileId);
  writeCache(key, next);
}

export function clearCachedFollowConnections(type, profileId) {
  if (!isValidProfileId(profileId)) return;
  removeCache(followConnectionsCacheKey(type, profileId));
}

export async function getFollowSummary(profileId, viewerId = null, options = {}) {
  if (!isValidProfileId(profileId)) {
    return {
      data: { followersCount: 0, followingCount: 0, isFollowing: false },
      error: null,
    };
  }

  const cached = options.skipCache ? null : getCachedFollowSummary(profileId, viewerId);
  if (cached) {
    return { data: cached, error: null, cached: true };
  }

  const supabase = createClient();
  if (!supabase) {
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
      isValidProfileId(viewerId) && viewerId !== profileId
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
  if (!supabase) {
    return { data: null, error: { message: "Follow system is not available." } };
  }

  if (!isValidProfileId(targetProfileId)) {
    return { data: null, error: { message: "This profile link needs to refresh. Please reload the page and try again." } };
  }

  const [{ userId, error: userError }, { accessToken, error: tokenError }] = await Promise.all([
    getCurrentUserId(supabase),
    getAccessTokenForApi(supabase),
  ]);

  if (userError || !userId) return { data: null, error: getFriendlyError(userError, "Please log in again.") };
  if (tokenError || !accessToken) return { data: null, error: getFriendlyError(tokenError, "Please log in again.") };

  if (userId === targetProfileId) {
    return { data: null, error: { message: "You cannot follow your own profile." } };
  }

  const { data, error } = await postJsonToApi(
    "/api/profiles/follow",
    accessToken,
    { target_profile_id: targetProfileId, action: "follow" },
    "Could not follow this member."
  );

  if (!error) {
    updateCachedFollowSummary(targetProfileId, userId, (current) => ({
      ...current,
      isFollowing: true,
      followersCount: current.isFollowing ? current.followersCount : current.followersCount + 1,
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
  if (!supabase) {
    return { error: { message: "Follow system is not available." } };
  }

  if (!isValidProfileId(targetProfileId)) {
    return { error: { message: "This profile link needs to refresh. Please reload the page and try again." } };
  }

  const [{ userId, error: userError }, { accessToken, error: tokenError }] = await Promise.all([
    getCurrentUserId(supabase),
    getAccessTokenForApi(supabase),
  ]);

  if (userError || !userId) return { error: getFriendlyError(userError, "Please log in again.") };
  if (tokenError || !accessToken) return { error: getFriendlyError(tokenError, "Please log in again.") };

  const { error } = await postJsonToApi(
    "/api/profiles/follow",
    accessToken,
    { target_profile_id: targetProfileId, action: "unfollow" },
    "Could not unfollow this member."
  );

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

  if (!isValidProfileId(profileId)) {
    return { data: [], error: { message: "Profile was not identified. Please refresh and try again." } };
  }

  const cached = skipCache ? null : getCachedFollowConnections(normalizedType, profileId);
  if (cached) {
    return { data: cached, error: null, cached: true };
  }

  const supabase = createClient();
  if (!supabase) {
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
    .map((row) =>
      normalizeConnectionRow({
        id: row.profile_id,
        profile_id: row.profile_id,
        created_at: row.followed_at,
        full_name: row.full_name || "SoldierHub member",
        avatar_color: row.avatar_color || "#314A66",
        avatar_url: row.avatar_url || null,
        base: row.base || "Fort Bliss",
      })
    )
    .filter(Boolean);

  cacheFollowConnections(normalizedType, profileId, rows);

  return {
    data: rows,
    error: null,
    cached: false,
  };
}
