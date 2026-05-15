import { createClient } from "./client";

function getFriendlyError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return null;

  const message = error.message || fallback;

  if (message.toLowerCase().includes("relation") || message.toLowerCase().includes("does not exist")) {
    return {
      ...error,
      message:
        "Follow system is not ready yet. Please run the follower SQL migration in Supabase first.",
    };
  }

  return { ...error, message };
}

function normalizeFollowCountRow(row = {}) {
  return {
    followersCount: Number(row.followers_count || row.follower_count || 0),
    followingCount: Number(row.following_count || 0),
  };
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

export async function getFollowSummary(profileId, viewerId = null) {
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

    return {
      data: {
        ...normalizeFollowCountRow(countRow),
        isFollowing: Boolean(followingResult?.data),
      },
      error: null,
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

  return { error: getFriendlyError(error, "Could not unfollow this member.") };
}

export async function listFollowConnections(type, profileId, { limit = 100 } = {}) {
  const supabase = createClient();
  if (!supabase || !profileId) {
    return { data: [], error: { message: "Follow system is not available." } };
  }

  const normalizedType = type === "following" ? "following" : "followers";
  const profileColumn = normalizedType === "following" ? "following_id" : "follower_id";
  const filterColumn = normalizedType === "following" ? "follower_id" : "following_id";

  const { data, error } = await supabase
    .from("profile_follows")
    .select(
      `${profileColumn}, created_at, profile:profiles!profile_follows_${profileColumn}_fkey(id, full_name, avatar_color, avatar_url, base, status, verification_status)`
    )
    .eq(filterColumn, profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: getFriendlyError(error, "Could not load follow list.") };
  }

  return {
    data: (data || [])
      .map((row) => ({
        id: row?.profile?.id || row?.[profileColumn] || null,
        created_at: row.created_at,
        profile: row.profile || null,
      }))
      .filter((row) => row.profile?.id),
    error: null,
  };
}
