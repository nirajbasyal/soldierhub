import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function normalizeSummary(row = {}, isFollowing = false) {
  return {
    followersCount: Math.max(0, Number(row.followers_count ?? row.followersCount ?? 0) || 0),
    followingCount: Math.max(0, Number(row.following_count ?? row.followingCount ?? 0) || 0),
    isFollowing: Boolean(isFollowing),
  };
}

async function getFollowSummaryForApi(supabase, profileId, viewerId) {
  if (!supabase || !isValidUuid(profileId)) {
    return { followersCount: 0, followingCount: 0, isFollowing: false };
  }

  const [{ data: countRow }, { data: followingRow }] = await Promise.all([
    supabase
      .from("profile_follow_counts")
      .select("profile_id, followers_count, following_count")
      .eq("profile_id", profileId)
      .maybeSingle(),
    isValidUuid(viewerId) && viewerId !== profileId
      ? supabase
          .from("profile_follows")
          .select("follower_id")
          .eq("follower_id", viewerId)
          .eq("following_id", profileId)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return normalizeSummary(countRow, Boolean(followingRow));
}

async function createFollowNotification({ supabase, targetProfileId, actorUserId, actorName }) {
  if (!supabase || !targetProfileId || !actorUserId || targetProfileId === actorUserId) return;

  const { data: existingNotification } = await supabase
    .from("notifications")
    .select("id")
    .eq("recipient_user_id", targetProfileId)
    .eq("actor_user_id", actorUserId)
    .eq("type", "follow")
    .maybeSingle();

  if (existingNotification?.id) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        read: false,
        actor_name_cached: actorName || "Someone",
        post_title_cached: "followed your profile",
        created_at: new Date().toISOString(),
      })
      .eq("id", existingNotification.id);

    if (updateError) console.error("Update follow notification failed:", updateError);
    return;
  }

  const { error } = await supabase.from("notifications").insert([
    {
      recipient_user_id: targetProfileId,
      actor_user_id: actorUserId,
      actor_name_cached: actorName || "Someone",
      type: "follow",
      post_title_cached: "followed your profile",
      read: false,
    },
  ]);

  if (error) console.error("Create follow notification failed:", error);
}

export async function POST(request) {
  const ipRateLimit = checkRateLimit(request, {
    keyPrefix: "profiles-follow-ip",
    limit: 90,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before following members." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const supabase = createAuthedSupabaseClient(accessToken);

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Please log in again before following members." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = checkRateLimit(request, {
    keyPrefix: `profiles-follow-user-${user.id}`,
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid follow request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const targetProfileId = cleanText(requestBody?.target_profile_id || requestBody?.targetProfileId);
  const action = cleanText(requestBody?.action).toLowerCase();

  if (!isValidUuid(targetProfileId)) {
    return NextResponse.json(
      { error: "Profile was not identified. Please refresh and try again." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (action !== "follow" && action !== "unfollow") {
    return NextResponse.json(
      { error: "Invalid follow action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (user.id === targetProfileId) {
    return NextResponse.json(
      { error: "You cannot follow your own profile." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: "Could not verify your profile. Please try again." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return NextResponse.json(
      { error: "Your profile must be verified before following members." },
      { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from("profiles")
    .select("id, status, verification_status")
    .eq("id", targetProfileId)
    .maybeSingle();

  if (targetProfileError) {
    return NextResponse.json(
      { error: "Could not verify the member profile. Please try again." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!targetProfile || getProfileStatus(targetProfile) !== "verified") {
    return NextResponse.json(
      { error: "That member profile is not available." },
      { status: 404, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (action === "unfollow") {
    const { data, error } = await supabase
      .from("profile_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetProfileId)
      .select("follower_id, following_id");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not unfollow this member." },
        { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    const [summary, viewer_summary] = await Promise.all([
      getFollowSummaryForApi(supabase, targetProfileId, user.id),
      getFollowSummaryForApi(supabase, user.id, user.id),
    ]);

    return NextResponse.json(
      {
        action: "unfollow",
        removed: Array.isArray(data) ? data.length > 0 : false,
        summary,
        viewer_summary,
      },
      { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await supabase
    .from("profile_follows")
    .upsert(
      { follower_id: user.id, following_id: targetProfileId },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true }
    )
    .select("follower_id, following_id, created_at")
    .maybeSingle();

  if (error) {
    if (error.code !== "23505") {
      return NextResponse.json(
        { error: error.message || "Could not follow this member." },
        { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }
  }

  if (data) {
    await createFollowNotification({
      supabase,
      targetProfileId,
      actorUserId: user.id,
      actorName: profile.full_name || user.email || "Someone",
    });
  }

  const [summary, viewer_summary] = await Promise.all([
    getFollowSummaryForApi(supabase, targetProfileId, user.id),
    getFollowSummaryForApi(supabase, user.id, user.id),
  ]);

  return NextResponse.json(
    {
      action: "follow",
      follow: data || null,
      already_following: !data,
      summary,
      viewer_summary,
    },
    { status: data ? 201 : 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
