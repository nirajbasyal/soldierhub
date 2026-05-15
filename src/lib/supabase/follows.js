import { createClient } from "./client";

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
    followersCount: Number(row.followers_count || row.follower_count || 0),
    followingCount: Number(row.following_count || 0),
  };
}

function cleanLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return 100;
  return Math.min(Math.floor(parsed), 100);
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

  const { userId, error: userError } = await getCurrentUserId(supabase);
  if (userError || !userId) return { data: [], error: getFriendlyError(userError, "Please log in again.") };

  if (userId !== profileId) {
    return { data: [], error: { message: "You can only view your own followers and following list." } };
  }

  const normalizedType = type === "following" ? "following" : "followers";
  const safeLimit = cleanLimit(limit);

  const { data, error } = await supabase.rpc("list_my_follow_connections", {
    p_list_type: normalizedType,
    p_limit: safeLimit,
  });

  if (error) {
    return { data: [], error: getFriendlyError(error, "Could not load follow list.") };
  }

  return {
    data: (data || [])
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
      .filter((row) => row.profile?.id),
    error: null,
  };
}
