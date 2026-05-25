"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, UserRound } from "lucide-react";
import { T } from "@/lib/theme";
import { colorFromString } from "@/lib/helpers";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import { findProfileByEmailForSearch } from "@/lib/db/profiles";
import * as Follows from "@/lib/supabase/follows";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import EmptyState from "@/components/ui/EmptyState";
import PostCard from "@/components/feed/PostCard";
import PostSkeleton from "@/components/ui/PostSkeleton";
import VisitorProfileHero from "@/components/profile/VisitorProfileHero";

const VISITOR_PROFILE_CACHE_PREFIX = "soldierhub_visitor_profile_v5:";
const VISITOR_PROFILE_CACHE_MAX_AGE_MS = 1000 * 60 * 5;
const EMAIL_LOOKUP_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAuthorId(item = {}) {
  return (
    item.author_id ||
    item.user_id ||
    item.profile_id ||
    item.created_by ||
    item.author_user_id ||
    item.author?.id ||
    item.profile?.id ||
    item.user?.id ||
    null
  );
}

function getSafeProfileId(value) {
  const cleaned = String(value || "").trim();
  return Follows.isValidProfileId?.(cleaned) ? cleaned : "";
}

function isEmailLookup(value) {
  return EMAIL_LOOKUP_PATTERN.test(String(value || "").trim().toLowerCase());
}

function normalizePostRow(row = {}) {
  const profile = row.profile || row.profiles || row.author || null;
  const postId = row.id || row.post_id || row.postId || row.post?.id || null;
  const authorId = getAuthorId(row) || profile?.id || null;

  return {
    ...row,
    id: postId,
    post_id: postId,
    author_id: authorId,
    author_name:
      row.author_name || row.author_name_cached || row.full_name || row.profile_full_name || profile?.full_name || "Member",
    author_color:
      row.author_color || row.author_color_cached || row.avatar_color || row.profile_avatar_color || profile?.avatar_color || "#314A66",
    upvote_count: row.upvote_count ?? row.upvotes_count ?? 0,
    comment_count: row.comment_count ?? row.comments_count ?? row.reply_count ?? 0,
  };
}

function cleanFallbackName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > 80 || name === "Member" || name === "Someone") return "";
  return name;
}

function normalizeProfile(row = {}, fallbackPost = null, fallbackName = "", fallbackId = "") {
  const name =
    row?.full_name ||
    fallbackPost?.author_name ||
    fallbackPost?.author_name_cached ||
    fallbackName ||
    "SoldierHub member";

  return {
    id: getSafeProfileId(row?.id || row?.profile_id || fallbackPost?.author_id || fallbackId),
    full_name: name,
    bio: row?.bio || "",
    avatar_color:
      row?.avatar_color ||
      fallbackPost?.author_color ||
      fallbackPost?.author_color_cached ||
      colorFromString(name),
    avatar_url: row?.avatar_url || null,
    base: row?.base || "Fort Bliss",
    status: row?.status || row?.verification_status || "verified",
  };
}

function makeFallbackProfile(profileId, fallbackName = "") {
  const safeProfileId = getSafeProfileId(profileId);
  if (!safeProfileId) return null;

  const safeName = cleanFallbackName(fallbackName) || "SoldierHub member";

  return {
    id: safeProfileId,
    full_name: safeName,
    bio: "",
    avatar_color: colorFromString(safeName),
    avatar_url: null,
    base: "Fort Bliss",
    status: "verified",
  };
}

function readVisitorProfileCache(cacheKey) {
  if (typeof window === "undefined" || !cacheKey) return null;

  try {
    const raw = window.localStorage.getItem(`${VISITOR_PROFILE_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);

    if (!savedAt || Date.now() - savedAt > VISITOR_PROFILE_CACHE_MAX_AGE_MS) {
      window.localStorage.removeItem(`${VISITOR_PROFILE_CACHE_PREFIX}${cacheKey}`);
      return null;
    }

    if (!parsed?.profile) return null;
    return {
      profile: parsed.profile,
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
    };
  } catch {
    window.localStorage.removeItem(`${VISITOR_PROFILE_CACHE_PREFIX}${cacheKey}`);
    return null;
  }
}

function writeVisitorProfileCache(cacheKey, profile, posts = []) {
  if (typeof window === "undefined" || !cacheKey || !profile) return;

  try {
    window.localStorage.setItem(
      `${VISITOR_PROFILE_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify({ profile, posts: posts.slice(0, 30), savedAt: Date.now() })
    );
  } catch {
    // Cache is only used to make profile navigation feel instant.
  }
}

async function resolveProfileIdFromLookup(rawLookup) {
  const lookup = String(rawLookup || "").trim();
  const uuidProfileId = getSafeProfileId(lookup);

  if (uuidProfileId) {
    return { profileId: uuidProfileId, profilePreview: null };
  }

  if (!isEmailLookup(lookup)) {
    return { profileId: "", profilePreview: null };
  }

  const { data, error } = await findProfileByEmailForSearch(lookup);

  if (error || !data?.id || !getSafeProfileId(data.id)) {
    return { profileId: "", profilePreview: null };
  }

  return {
    profileId: data.id,
    profilePreview: {
      id: data.id,
      full_name: data.full_name || "SoldierHub member",
      bio: "",
      avatar_color: data.avatar_color || "#314A66",
      avatar_url: data.avatar_url || null,
      base: data.base || "Fort Bliss",
      status: "verified",
    },
  };
}

export default function VisitorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentUser,
    authLoading,
    isLiveMode,
    posts = [],
    setAuthModal,
    pushToast,
  } = useApp();
  const routeProfileLookup = typeof params?.id === "string" ? decodeURIComponent(params.id).trim() : "";
  const routeProfileId = getSafeProfileId(routeProfileLookup);
  const fallbackName = cleanFallbackName(searchParams?.get("name") || "");

  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const [resolvedProfileId, setResolvedProfileId] = useState(routeProfileId);
  const [followSummary, setFollowSummary] = useState({
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
  });
  const [followLoading, setFollowLoading] = useState(false);

  const activeProfileId = getSafeProfileId(profile?.id);
  const targetProfileId = routeProfileId || getSafeProfileId(resolvedProfileId) || activeProfileId;
  const isOwnProfile = Boolean(targetProfileId && currentUser?.id === targetProfileId);

  useEffect(() => {
    const nextRouteProfileId = getSafeProfileId(routeProfileLookup);

    setResolvedProfileId(nextRouteProfileId);
    setProfile(null);
    setUserPosts([]);
    setLoading(true);
    setRefreshingProfile(false);
    setFollowLoading(false);
    setFollowSummary({ followersCount: 0, followingCount: 0, isFollowing: false });
  }, [routeProfileLookup]);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.replace("/");
      setAuthModal?.("login");
      return;
    }

    if (isOwnProfile) {
      router.replace("/profile");
    }
  }, [authLoading, currentUser, isOwnProfile, router, setAuthModal]);

  const loadFollowSummary = useCallback(
    async ({ silent = false, skipCache = false } = {}) => {
      if (!targetProfileId || isOwnProfile) return;

      if (!silent) {
        const cachedSummary = Follows.getCachedFollowSummary?.(targetProfileId, currentUser?.id || null);
        if (cachedSummary) {
          setFollowSummary(cachedSummary);
        } else {
          setFollowLoading(true);
        }
      }

      const { data, error } = await Follows.getFollowSummary(targetProfileId, currentUser?.id || null, {
        skipCache,
      });

      if (!silent) setFollowLoading(false);

      if (!error && data) {
        setFollowSummary(data);
      }
    },
    [currentUser?.id, isOwnProfile, targetProfileId]
  );

  useEffect(() => {
    if (!targetProfileId || isOwnProfile) return;

    const cachedSummary = Follows.getCachedFollowSummary?.(targetProfileId, currentUser?.id || null);
    loadFollowSummary({ silent: Boolean(cachedSummary), skipCache: false });

    if (cachedSummary) {
      loadFollowSummary({ silent: true, skipCache: true });
    }
  }, [currentUser?.id, isOwnProfile, loadFollowSummary, targetProfileId]);

  const localPostsForProfile = useMemo(() => {
    const safeLookupId = routeProfileId || getSafeProfileId(resolvedProfileId) || activeProfileId;
    if (!safeLookupId) return [];

    return posts
      .filter((post) => getAuthorId(post) === safeLookupId && !post?.anonymous)
      .map(normalizePostRow)
      .filter((post) => post.id);
  }, [activeProfileId, posts, resolvedProfileId, routeProfileId]);

  useEffect(() => {
    if (authLoading || !routeProfileLookup || isOwnProfile) return;

    let cancelled = false;

    async function loadVisitorProfile() {
      const startingProfileId = routeProfileId || getSafeProfileId(resolvedProfileId);
      const cacheKey = startingProfileId || routeProfileLookup;
      const cached = readVisitorProfileCache(cacheKey);
      const cachedProfileId = getSafeProfileId(cached?.profile?.id);
      const cacheMatchesRoute = Boolean(cached?.profile) && (!routeProfileId || cachedProfileId === routeProfileId);

      if (cacheMatchesRoute) {
        if (cachedProfileId) setResolvedProfileId(cachedProfileId);
        setProfile(cached.profile);
        setUserPosts(cached.posts || []);
        setLoading(false);
        setRefreshingProfile(true);
      } else if (localPostsForProfile.length > 0) {
        const fallbackProfile = normalizeProfile(null, localPostsForProfile[0], fallbackName, startingProfileId);
        if (fallbackProfile.id) setResolvedProfileId(fallbackProfile.id);
        setProfile(fallbackProfile);
        setUserPosts(localPostsForProfile);
        setLoading(false);
        setRefreshingProfile(true);
      } else if (startingProfileId) {
        const fallbackProfile = makeFallbackProfile(startingProfileId, fallbackName);
        setProfile(fallbackProfile);
        setUserPosts([]);
        setLoading(false);
        setRefreshingProfile(true);
      } else {
        setLoading(true);
      }

      let resolvedLookup = startingProfileId;
      let previewProfile = null;

      if (!resolvedLookup) {
        const resolved = await resolveProfileIdFromLookup(routeProfileLookup);
        resolvedLookup = resolved.profileId;
        previewProfile = resolved.profilePreview;

        if (resolvedLookup && !cancelled) {
          setResolvedProfileId(resolvedLookup);
        }
      }

      const resolvedCache = resolvedLookup ? readVisitorProfileCache(resolvedLookup) : null;
      const resolvedCacheProfile = resolvedCache?.profile || null;

      if (!previewProfile && resolvedCacheProfile) {
        previewProfile = resolvedCacheProfile;
      }

      let profileRow = previewProfile;
      let postRows = resolvedLookup ? localPostsForProfile : [];

      try {
        if (isLiveMode && resolvedLookup) {
          const supabase = createClient();

          if (supabase) {
            const [{ data: profileData }, { data: livePosts }] = await Promise.all([
              supabase
                .from("profiles")
                .select("id, full_name, bio, avatar_color, avatar_url, base, status, verification_status")
                .eq("id", resolvedLookup)
                .maybeSingle(),
              supabase
                .from("posts_with_meta")
                .select("*")
                .eq("author_id", resolvedLookup)
                .eq("anonymous", false)
                .order("created_at", { ascending: false })
                .limit(30),
            ]);

            profileRow = profileData || previewProfile || resolvedCacheProfile || null;
            postRows = Array.isArray(livePosts)
              ? livePosts.map(normalizePostRow).filter((post) => post.id)
              : localPostsForProfile;
          }
        }
      } catch {
        profileRow = previewProfile || resolvedCacheProfile || null;
        postRows = resolvedLookup ? localPostsForProfile : [];
      }

      if (cancelled) return;

      const fallbackPost = postRows[0] || localPostsForProfile[0] || null;
      const fallbackDisplayName =
        fallbackName ||
        profileRow?.full_name ||
        previewProfile?.full_name ||
        resolvedCacheProfile?.full_name ||
        fallbackPost?.author_name ||
        fallbackPost?.author_name_cached ||
        "SoldierHub member";

      const safeFallbackProfile = makeFallbackProfile(resolvedLookup, fallbackDisplayName);
      const normalizedProfile =
        profileRow || fallbackPost
          ? normalizeProfile(profileRow || {}, fallbackPost, fallbackDisplayName, resolvedLookup)
          : null;
      const nextProfile = normalizedProfile || safeFallbackProfile;

      setProfile(nextProfile);
      setUserPosts(postRows);
      setLoading(false);
      setRefreshingProfile(false);

      if (nextProfile?.id) {
        setResolvedProfileId(nextProfile.id);
        writeVisitorProfileCache(routeProfileLookup, nextProfile, postRows);
        writeVisitorProfileCache(nextProfile.id, nextProfile, postRows);
      }
    }

    loadVisitorProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, fallbackName, isLiveMode, isOwnProfile, localPostsForProfile, resolvedProfileId, routeProfileId, routeProfileLookup]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      setAuthModal?.("login");
      return;
    }

    const safeTargetProfileId = routeProfileId || getSafeProfileId(resolvedProfileId) || getSafeProfileId(profile?.id);

    if (!safeTargetProfileId) {
      pushToast?.("Profile is still loading. Please try again in a moment.", "info");
      return;
    }

    if (followLoading || currentUser.id === safeTargetProfileId) return;

    setFollowLoading(true);
    const wasFollowing = followSummary.isFollowing;

    const optimisticSummary = {
      ...followSummary,
      isFollowing: !wasFollowing,
      followersCount: Math.max(0, (followSummary.followersCount || 0) + (wasFollowing ? -1 : 1)),
    };

    setFollowSummary(optimisticSummary);
    Follows.cacheFollowSummary?.(safeTargetProfileId, currentUser.id, optimisticSummary);

    const result = wasFollowing
      ? await Follows.unfollowUser(safeTargetProfileId)
      : await Follows.followUser(safeTargetProfileId);

    setFollowLoading(false);

    if (result.error) {
      const rollbackSummary = {
        ...optimisticSummary,
        isFollowing: wasFollowing,
        followersCount: Math.max(0, (optimisticSummary.followersCount || 0) + (wasFollowing ? 1 : -1)),
      };
      setFollowSummary(rollbackSummary);
      Follows.cacheFollowSummary?.(safeTargetProfileId, currentUser.id, rollbackSummary);
      pushToast?.(result.error.message || "Could not update follow status.", "error");
      return;
    }

    pushToast?.(wasFollowing ? "Member unfollowed." : "Member followed.", "success");
    loadFollowSummary({ silent: true, skipCache: true });
  };

  const publicPostCount = userPosts.length;
  const canUseFollowButton = Boolean(targetProfileId) && !isOwnProfile;

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.9), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)",
        }}
      >
        <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 md:px-6 md:py-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#D5E2F2] bg-white text-[#0B1C2C] shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>

          {loading ? (
            <section className="overflow-hidden rounded-[28px] border border-[#D5E2F2] bg-white shadow-[0_18px_42px_rgba(7,27,51,0.11)]">
              <div className="flex min-h-[210px] items-center gap-4 bg-[#0B1C2C] px-4 py-5">
                <div className="h-[76px] w-[76px] animate-pulse rounded-full bg-white/20" />
                <div className="min-w-0 flex-1">
                  <div className="h-7 w-44 animate-pulse rounded-full bg-white/20" />
                  <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded-full bg-white/15" />
                </div>
              </div>
            </section>
          ) : profile ? (
            <VisitorProfileHero
              profile={profile}
              postCount={publicPostCount}
              followersCount={followSummary.followersCount}
              followingCount={followSummary.followingCount}
              followLoading={followLoading}
              isFollowing={followSummary.isFollowing}
              canFollow={canUseFollowButton}
              refreshing={refreshingProfile}
              profileId={targetProfileId || profile?.id || routeProfileLookup}
              pushToast={pushToast}
              onFollowToggle={handleFollowToggle}
            />
          ) : (
            <section className="rounded-[28px] border border-[#D5E2F2] bg-white p-8 shadow-[0_18px_42px_rgba(7,27,51,0.09)]">
              <EmptyState icon={UserRound} title="Profile not found" body="This profile may not be available." />
            </section>
          )}

          {(loading || profile) ? (
            <section className="mt-6">
              <div
                className="mb-4 flex items-center justify-between gap-3 rounded-3xl border p-4 md:p-5"
                style={{ backgroundColor: T.card, borderColor: T.border }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: T.softBlue || "#EAF2FC" }}
                  >
                    <FileText size={20} style={{ color: T.blue }} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-extrabold tracking-[-0.02em] md:text-2xl" style={{ color: T.navy }}>
                      Public posts
                    </h2>
                    <p className="mt-0.5 text-sm" style={{ color: T.textMuted }}>
                      Non-anonymous posts shared by this member.
                    </p>
                  </div>
                </div>
              </div>

              <div className="-mx-3 flex flex-col gap-2.5 sh-feed-post-list sm:mx-0">
                {loading ? (
                  <>
                    <PostSkeleton />
                    <PostSkeleton />
                  </>
                ) : userPosts.length > 0 ? (
                  userPosts.map((post) => <PostCard key={post.id} post={post} />)
                ) : (
                  <div
                    className="mx-3 rounded-3xl border p-8 text-center md:mx-0 md:p-10"
                    style={{ backgroundColor: T.card, borderColor: T.border }}
                  >
                    <EmptyState
                      icon={FileText}
                      title="No public posts yet"
                      body="Anonymous posts stay private, so only public posts appear here."
                    />
                  </div>
                )}
              </div>
            </section>
          ) : null}

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
