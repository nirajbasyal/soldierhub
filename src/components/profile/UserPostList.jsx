"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, PenLine } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import PostCard from "@/components/feed/PostCard";

const PROFILE_POST_CACHE_PREFIX = "soldierhub_profile_posts_cache_";

function getProfilePostCacheKey(userId) {
  return `${PROFILE_POST_CACHE_PREFIX}${userId || "guest"}`;
}

function readCachedProfilePosts(userId) {
  if (typeof window === "undefined" || !userId) return [];

  try {
    const raw = window.localStorage.getItem(getProfilePostCacheKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.posts) ? parsed.posts : [];
  } catch {
    return [];
  }
}

function saveCachedProfilePosts(userId, posts) {
  if (typeof window === "undefined" || !userId || !Array.isArray(posts)) return;

  try {
    window.localStorage.setItem(
      getProfilePostCacheKey(userId),
      JSON.stringify({ savedAt: Date.now(), posts: posts.slice(0, 50) })
    );
  } catch {
    // Browser storage can fail in private mode or when full. Profile posts still work normally.
  }
}

function postBelongsToCurrentUser(post, currentUser) {
  if (!post || !currentUser?.id) return false;

  return (
    post.author_id === currentUser.id ||
    post.user_id === currentUser.id ||
    post.profile_id === currentUser.id ||
    post.viewer_is_author === true
  );
}

export default function UserPostList() {
  const {
    currentUser,
    posts = [],
    myPosts: userPosts = [],
  } = useApp();

  const [cachedProfilePosts, setCachedProfilePosts] = useState([]);

  useEffect(() => {
    setCachedProfilePosts(readCachedProfilePosts(currentUser?.id));
  }, [currentUser?.id]);

  const liveProfilePosts = useMemo(() => {
    if (userPosts.length > 0) return userPosts;

    return posts.filter((post) => postBelongsToCurrentUser(post, currentUser));
  }, [currentUser, posts, userPosts]);

  useEffect(() => {
    if (!currentUser?.id || liveProfilePosts.length === 0) return;

    setCachedProfilePosts(liveProfilePosts);
    saveCachedProfilePosts(currentUser.id, liveProfilePosts);
  }, [currentUser?.id, liveProfilePosts]);

  const visiblePosts = liveProfilePosts.length > 0 ? liveProfilePosts : cachedProfilePosts;

  return (
    <section className="mt-6">
      <div
        className="rounded-3xl border p-4 md:p-5 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ backgroundColor: "rgba(255,255,255,0.86)", borderColor: T.border }}
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(220,232,247,0.95)" }}>
            <FileText size={20} style={{ color: T.blue }} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-[-0.02em]" style={{ color: T.navy }}>
              Your posts
            </h2>
            <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
              Posts you have shared with the Fort Bliss community.
            </p>
          </div>
        </div>
        <div className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "rgba(244,248,253,0.95)", color: T.textSubtle }}>
          {visiblePosts.length} {visiblePosts.length === 1 ? "post" : "posts"}
        </div>
      </div>

      <div className="-mx-4 md:mx-0 flex flex-col gap-2.5 sh-feed-post-list">
        {visiblePosts.length === 0 && (
          <div className="mx-4 md:mx-0 rounded-3xl border p-8 md:p-10 text-center" style={{ backgroundColor: T.card, borderColor: T.border, boxShadow: "0 12px 30px rgba(7,27,51,0.05)" }}>
            <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(220,232,247,0.95)" }}>
              <PenLine size={24} style={{ color: T.blue }} />
            </div>
            <h3 className="mt-4 text-xl font-bold" style={{ color: T.navy }}>
              No posts yet
            </h3>
            <p className="mt-2 text-sm leading-7 max-w-md mx-auto" style={{ color: T.textMuted }}>
              Your posts will appear here after you share something with the Fort Bliss community.
            </p>
          </div>
        )}

        {visiblePosts.map((post) => (
          <PostCard key={post.id} post={{ ...post, viewer_is_author: true }} />
        ))}
      </div>
    </section>
  );
}
