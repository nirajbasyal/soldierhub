"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Loader2, UserCheck, UserPlus, UserRound } from "lucide-react";
import { T } from "@/lib/theme";
import { colorFromString } from "@/lib/helpers";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import * as Follows from "@/lib/supabase/follows";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import PostCard from "@/components/feed/PostCard";
import PostSkeleton from "@/components/ui/PostSkeleton";
import ShareProfileButton from "@/components/profile/ShareProfileButton";

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

function normalizeProfile(row = {}, fallbackPost = null, fallbackName = "") {
  const name =
    row?.full_name ||
    fallbackPost?.author_name ||
    fallbackPost?.author_name_cached ||
    fallbackName ||
    "SoldierHub member";

  return {
    id: row?.id || fallbackPost?.author_id || null,
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

function StatCard({ label, value }) {
  return (
    <div
      className="rounded-2xl border px-2 py-2.5 md:p-3 text-center md:text-left"
      style={{ backgroundColor: "rgba(244,248,253,0.9)", borderColor: "#D5E2F2" }}
    >
      <div className="text-xl md:text-2xl font-extrabold tabular-nums" style={{ color: T.navy }}>
        {value}
      </div>
      <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>
        {label}
      </div>
    </div>
  );
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
  const profileId = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";
  const fallbackName = cleanFallbackName(searchParams?.get("name") || "");

  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followSummary, setFollowSummary] = useState({
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
  });
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = Boolean(profileId && currentUser?.id === profileId);

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

  const loadFollowSummary = useCallback(async () => {
    if (!profileId || isOwnProfile) return;

    const { data, error } = await Follows.getFollowSummary(profileId, currentUser?.id || null);

    if (!error) {
      setFollowSummary(data);
    }
  }, [currentUser?.id, isOwnProfile, profileId]);

  useEffect(() => {
    loadFollowSummary();
  }, [loadFollowSummary]);

  useEffect(() => {
    if (authLoading || !profileId || isOwnProfile) return;

    let cancelled = false;

    async function loadVisitorProfile() {
      setLoading(true);

      const localPosts = posts
        .filter((post) => getAuthorId(post) === profileId && !post?.anonymous)
        .map(normalizePostRow)
        .filter((post) => post.id);

      let profileRow = null;
      let postRows = localPosts;

      try {
        if (isLiveMode) {
          const supabase = createClient();

          if (supabase) {
            const [{ data: profileData }, { data: livePosts }] = await Promise.all([
              supabase
                .from("profiles")
                .select("id, full_name, bio, avatar_color, avatar_url, base, status, verification_status")
                .eq("id", profileId)
                .maybeSingle(),
              supabase
                .from("posts_with_meta")
                .select("*")
                .eq("author_id", profileId)
                .eq("anonymous", false)
                .order("created_at", { ascending: false })
                .limit(30),
            ]);

            profileRow = profileData || null;
            postRows = Array.isArray(livePosts)
              ? livePosts.map(normalizePostRow).filter((post) => post.id)
              : localPosts;
          }
        }
      } catch {
        profileRow = null;
        postRows = localPosts;
      }

      if (cancelled) return;

      const fallbackPost = postRows[0] || localPosts[0] || null;
      const safeFallbackProfile = fallbackName
        ? {
            id: profileId,
            full_name: fallbackName,
            bio: "",
            avatar_color: colorFromString(fallbackName),
            avatar_url: null,
            base: "Fort Bliss",
            status: "verified",
          }
        : null;

      setProfile(
        profileRow || fallbackPost
          ? normalizeProfile(profileRow, fallbackPost, fallbackName)
          : safeFallbackProfile
      );
      setUserPosts(postRows);
      setLoading(false);
    }

    loadVisitorProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser?.id, fallbackName, isLiveMode, isOwnProfile, posts, profileId]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      setAuthModal?.("login");
      return;
    }

    if (!profileId || followLoading || isOwnProfile) return;

    setFollowLoading(true);
    const wasFollowing = followSummary.isFollowing;

    setFollowSummary((prev) => ({
      ...prev,
      isFollowing: !wasFollowing,
      followersCount: Math.max(0, (prev.followersCount || 0) + (wasFollowing ? -1 : 1)),
    }));

    const result = wasFollowing
      ? await Follows.unfollowUser(profileId)
      : await Follows.followUser(profileId);

    setFollowLoading(false);

    if (result.error) {
      setFollowSummary((prev) => ({
        ...prev,
        isFollowing: wasFollowing,
        followersCount: Math.max(0, (prev.followersCount || 0) + (wasFollowing ? 1 : -1)),
      }));
      pushToast?.(result.error.message || "Could not update follow status.", "error");
      return;
    }

    pushToast?.(wasFollowing ? "Member unfollowed." : "Member followed.", "success");
    loadFollowSummary();
  };

  const publicPostCount = userPosts.length;

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.9), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.back()}>
            Back
          </Button>

          <section
            className="mt-5 rounded-[26px] md:rounded-[32px] border overflow-hidden relative"
            style={{
              borderColor: "#D5E2F2",
              backgroundColor: "rgba(255,255,255,0.92)",
              boxShadow: "0 14px 38px rgba(7,27,51,0.07)",
            }}
          >
            <div className="absolute left-5 right-5 top-0 h-1 rounded-b-full" style={{ backgroundColor: "rgba(30,78,140,0.72)" }} />

            <div className="px-4 py-5 md:p-8">
              {loading ? (
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 animate-pulse rounded-[26px] bg-[#DDE6EF]" />
                  <div className="min-w-0 flex-1">
                    <div className="h-6 w-48 animate-pulse rounded-full bg-[#DDE6EF]" />
                    <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded-full bg-[#E8EEF5]" />
                  </div>
                </div>
              ) : profile ? (
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-5">
                  <div
                    className="rounded-[22px] md:rounded-[28px] p-1.5 md:p-2 border shrink-0 mx-auto md:mx-0"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#D5E2F2" }}
                  >
                    <Avatar
                      name={profile.full_name}
                      color={profile.avatar_color}
                      src={profile.avatar_url}
                      size={84}
                    />
                  </div>

                  <div className="min-w-0 flex-1 text-center md:text-left">
                    <div
                      className="inline-flex items-center gap-1.5 md:gap-2 rounded-full border px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-[0.12em]"
                      style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: "#D5E2F2", color: T.blue }}
                    >
                      <UserRound size={13} />
                      Member Profile
                    </div>

                    <h1 className="mt-3 text-[2rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.04em] leading-[0.95]" style={{ color: T.navy }}>
                      {profile.full_name}
                    </h1>

                    <p className="mt-2 text-sm md:text-base leading-6 md:leading-7 max-w-2xl mx-auto md:mx-0" style={{ color: profile.bio ? T.text : T.textMuted }}>
                      {profile.bio || "This member has not added a bio yet."}
                    </p>

                    <div className="mt-4 flex flex-col sm:flex-row justify-center md:justify-start gap-2">
                      <button
                        type="button"
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 disabled:opacity-60"
                        style={{
                          backgroundColor: followSummary.isFollowing ? "rgba(220,232,247,0.96)" : T.navy,
                          borderColor: followSummary.isFollowing ? "#BCD0EA" : "rgba(7,27,51,0.18)",
                          color: followSummary.isFollowing ? T.blue : "#FFFFFF",
                        }}
                      >
                        {followLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : followSummary.isFollowing ? (
                          <UserCheck size={16} />
                        ) : (
                          <UserPlus size={16} />
                        )}
                        {followSummary.isFollowing ? "Following" : "Follow"}
                      </button>

                      <ShareProfileButton
                        profileId={profileId}
                        profileName={profile.full_name}
                        pushToast={pushToast}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:min-w-[150px]">
                    <StatCard label="Posts" value={publicPostCount} />
                    <StatCard label="Followers" value={followSummary.followersCount || 0} />
                    <StatCard label="Following" value={followSummary.followingCount || 0} />
                  </div>
                </div>
              ) : (
                <EmptyState icon={UserRound} title="Profile not found" body="This profile may not be available." />
              )}
            </div>
          </section>

          {(loading || profile) ? (
            <section className="mt-6">
              <div
                className="rounded-3xl border p-4 md:p-5 mb-4 flex items-center justify-between gap-3"
                style={{ backgroundColor: T.card, borderColor: T.border }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: T.softBlue || "#EAF2FC" }}
                  >
                    <FileText size={20} style={{ color: T.blue }} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-[-0.02em]" style={{ color: T.navy }}>
                      Public posts
                    </h2>
                    <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
                      Non-anonymous posts shared by this member.
                    </p>
                  </div>
                </div>
              </div>

              <div className="-mx-4 md:mx-0 flex flex-col gap-2.5 sh-feed-post-list">
                {loading ? (
                  <>
                    <PostSkeleton />
                    <PostSkeleton />
                  </>
                ) : userPosts.length > 0 ? (
                  userPosts.map((post) => <PostCard key={post.id} post={post} />)
                ) : (
                  <div
                    className="mx-4 md:mx-0 rounded-3xl border p-8 md:p-10 text-center"
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
