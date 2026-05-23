"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, RefreshCw } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T } from "@/lib/theme";
import { subscribeToPosts } from "@/lib/db/realtime";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import FeedHero from "@/components/feed/FeedHero";
import PostComposer from "@/components/feed/PostComposer";
import CategoryStrip from "@/components/feed/CategoryStrip";
import PostCard from "@/components/feed/PostCard";
import PostSkeleton from "@/components/ui/PostSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import MobileWeatherStrip from "@/components/tools/MobileWeatherStrip";
import BAHCard from "@/components/tools/BAHCard";
import GateHoursCard from "@/components/tools/GateHoursCard";
import SiteInfoCard from "@/components/tools/SiteInfoCard";

const FEED_CACHE_KEY = "soldierhub_feed_cache_v2";
const LEGACY_FEED_CACHE_KEYS = ["soldierhub_feed_cache_v1"];
const FEED_CACHE_MAX_AGE_MS = 1000 * 60 * 5;
const INITIAL_RENDERED_POSTS = 20;
const RENDER_INCREMENT = 20;
const PUBLISH_SCROLL_KEY = "soldierhub_scroll_to_latest_post";

function getRealPostId(post) {
  return post?.post_id || post?.postId || post?.post?.id || post?.id || null;
}

function getAuthorId(post) {
  return (
    post?.author_id ||
    post?.user_id ||
    post?.profile_id ||
    post?.created_by ||
    post?.author_user_id ||
    post?.profile?.id ||
    post?.profiles?.id ||
    post?.author?.id ||
    null
  );
}

function isValidFeedPost(post) {
  if (!getRealPostId(post)) return false;
  if (!getAuthorId(post) && !post?.anonymous) return false;
  if (post?.status === "deleted" || post?.status === "removed") return false;
  return true;
}

function normalizeFeedPostForCard(post) {
  const postId = getRealPostId(post);

  return {
    ...post,
    id: postId,
    post_id: post?.post_id || postId,
  };
}

function readCachedFeedFromKey(cacheKey) {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const posts = Array.isArray(parsed?.posts) ? parsed.posts : [];
    const savedAt = Number(parsed?.savedAt || 0);

    if (!posts.length || !savedAt || Date.now() - savedAt > FEED_CACHE_MAX_AGE_MS) {
      window.localStorage.removeItem(cacheKey);
      return [];
    }

    return posts.filter(isValidFeedPost).map(normalizeFeedPostForCard);
  } catch {
    window.localStorage.removeItem(cacheKey);
    return [];
  }
}

function readCachedFeed() {
  const primaryCachedPosts = readCachedFeedFromKey(FEED_CACHE_KEY);
  if (primaryCachedPosts.length > 0) return primaryCachedPosts;

  for (const legacyKey of LEGACY_FEED_CACHE_KEYS) {
    const legacyCachedPosts = readCachedFeedFromKey(legacyKey);
    if (legacyCachedPosts.length > 0) return legacyCachedPosts;
  }

  return [];
}

function clearFeedCaches() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(FEED_CACHE_KEY);
  LEGACY_FEED_CACHE_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));
}

export default function HomePage() {
  const {
    posts,
    currentUser,
    search,
    category,
    setCategory,
    postsLoading,
    hasMorePosts,
    loadingMorePosts,
    loadMorePosts,
    reloadPosts,
    hasNewFeedItems,
    setHasNewFeedItems,
  } = useApp();

  const [cachedPosts, setCachedPosts] = useState(readCachedFeed);
  const [renderLimit, setRenderLimit] = useState(INITIAL_RENDERED_POSTS);
  const [refreshingFeed, setRefreshingFeed] = useState(false);
  const [feedRealtimeActive, setFeedRealtimeActive] = useState(false);
  const postListRef = useRef(null);
  const hasHandledPublishScrollRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let unsubscribe = null;

    const stopFeedRealtime = () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      setFeedRealtimeActive(false);
    };

    const startFeedRealtime = () => {
      if (document.hidden || unsubscribe) return;

      unsubscribe = subscribeToPosts(() => {
        setHasNewFeedItems(true);
      });
      setFeedRealtimeActive(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopFeedRealtime();
        return;
      }

      startFeedRealtime();
    };

    startFeedRealtime();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopFeedRealtime();
    };
  }, [setHasNewFeedItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!posts.length) {
      if (!postsLoading) {
        clearFeedCaches();
        setCachedPosts([]);
      }
      return;
    }

    const postsToCache = posts
      .filter(isValidFeedPost)
      .slice(0, 30)
      .map(normalizeFeedPostForCard);

    setCachedPosts(postsToCache);

    try {
      window.localStorage.setItem(
        FEED_CACHE_KEY,
        JSON.stringify({ savedAt: Date.now(), posts: postsToCache })
      );
      LEGACY_FEED_CACHE_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));
    } catch {
      clearFeedCaches();
    }
  }, [posts, postsLoading]);

  const feedPosts = useMemo(() => {
    const source = posts.length ? posts : cachedPosts;
    return source.filter(isValidFeedPost).map(normalizeFeedPostForCard);
  }, [posts, cachedPosts]);

  const showInitialSkeleton = postsLoading && feedPosts.length === 0;

  const counts = useMemo(() => {
    const c = { All: feedPosts.length };

    CATEGORIES.forEach((cat) => {
      if (cat.key !== "All") {
        c[cat.key] = feedPosts.filter((p) => p.category === cat.key).length;
      }
    });

    return c;
  }, [feedPosts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return feedPosts.filter((p) => {
      if (category !== "All" && p.category !== category) return false;

      if (!q) return true;

      return (
        (p.title || "").toLowerCase().includes(q) ||
        (p.body || "").toLowerCase().includes(q) ||
        (p.author_name || "").toLowerCase().includes(q)
      );
    });
  }, [feedPosts, category, search]);

  useEffect(() => {
    setRenderLimit(INITIAL_RENDERED_POSTS);
  }, [category, search]);

  useEffect(() => {
    setRenderLimit((currentLimit) =>
      Math.min(
        Math.max(currentLimit, INITIAL_RENDERED_POSTS),
        Math.max(filtered.length, INITIAL_RENDERED_POSTS)
      )
    );
  }, [filtered.length]);

  const visibleFiltered = useMemo(() => {
    return filtered.slice(0, renderLimit);
  }, [filtered, renderLimit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasHandledPublishScrollRef.current) return;
    if (showInitialSkeleton || visibleFiltered.length === 0) return;

    let shouldScroll = false;

    try {
      shouldScroll = window.sessionStorage.getItem(PUBLISH_SCROLL_KEY) === "1";
    } catch {
      shouldScroll = false;
    }

    if (!shouldScroll) return;

    hasHandledPublishScrollRef.current = true;

    try {
      window.sessionStorage.removeItem(PUBLISH_SCROLL_KEY);
    } catch {
      // Ignore storage failures.
    }

    const scrollToLatestPost = () => {
      const target = postListRef.current;
      if (!target) return;

      const top = target.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    };

    const quickTimer = window.setTimeout(scrollToLatestPost, 120);
    const finalTimer = window.setTimeout(scrollToLatestPost, 520);

    return () => {
      window.clearTimeout(quickTimer);
      window.clearTimeout(finalTimer);
    };
  }, [showInitialSkeleton, visibleFiltered.length]);

  const hasMoreRenderedPosts = visibleFiltered.length < filtered.length;
  const canLoadFromServer = !search.trim() && category === "All" && hasMorePosts;
  const showLoadMore = feedPosts.length > 0 && (hasMoreRenderedPosts || canLoadFromServer);

  const handleRefreshFeed = async () => {
    setRefreshingFeed(true);

    try {
      await reloadPosts();
      setRenderLimit(INITIAL_RENDERED_POSTS);
    } finally {
      setRefreshingFeed(false);
    }
  };

  const handleLoadMore = async () => {
    if (hasMoreRenderedPosts) {
      setRenderLimit((currentLimit) => currentLimit + RENDER_INCREMENT);
      return;
    }

    await loadMorePosts();
    setRenderLimit((currentLimit) => currentLimit + RENDER_INCREMENT);
  };

  return (
    <AppShell>
      <main className="sh-desktop-feed-compact mx-auto w-full max-w-[1010px] overflow-x-hidden px-4 pt-0 pb-24 sm:px-5 md:px-5 md:pt-5 md:pb-10 lg:px-5 xl:px-0">
        <div className="grid grid-cols-1 justify-center gap-3 lg:grid-cols-[minmax(0,620px)_300px] lg:gap-4 xl:gap-5">
          <div className="mx-auto flex w-full max-w-[620px] min-w-0 flex-col gap-3">
            <div className="block pt-1 lg:hidden">
              <MobileWeatherStrip />
            </div>

            <div>
              <FeedHero currentUser={currentUser} postCount={feedPosts.length} />
            </div>

            <div className="hidden md:block">
              <PostComposer />
            </div>

            <div
              className="sticky top-[68px] z-20 w-full rounded-[22px] border px-1 py-1 backdrop-blur-xl md:top-[85px]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(234,240,248,0.97) 0%, rgba(234,240,248,0.90) 100%)",
                borderColor: "rgba(207,218,232,0.72)",
              }}
            >
              <CategoryStrip
                selected={category}
                counts={counts}
                onSelect={setCategory}
              />
            </div>

            {hasNewFeedItems ? (
              <button
                type="button"
                onClick={handleRefreshFeed}
                disabled={refreshingFeed || postsLoading}
                className="mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: "#FDECF0",
                  borderColor: "rgba(179,25,66,0.28)",
                  color: T.ink,
                }}
                aria-live="polite"
              >
                <RefreshCw
                  size={16}
                  className={refreshingFeed || postsLoading ? "animate-spin" : ""}
                />
                {refreshingFeed || postsLoading
                  ? "Refreshing feed..."
                  : "New posts available — tap to refresh"}
              </button>
            ) : null}

            {showInitialSkeleton ? (
              <div className="flex flex-col gap-3">
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="rounded-[24px] border p-6 sh-card-premium"
                style={{ backgroundColor: T.card, borderColor: T.border }}
              >
                <EmptyState
                  icon={Inbox}
                  title="No posts match your filter"
                  body={
                    search
                      ? `Nothing for "${search}". Try a different search.`
                      : "Try a different category or be the first to post."
                  }
                />
              </div>
            ) : (
              <>
                <div ref={postListRef} className="sh-feed-post-list mx-0 flex w-full scroll-mt-24 flex-col gap-3">
                  {visibleFiltered.map((post) => {
                    const normalizedPost = normalizeFeedPostForCard(post);
                    return <PostCard key={normalizedPost.id} post={normalizedPost} />;
                  })}
                </div>

                {showLoadMore ? (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMorePosts}
                      className="rounded-full border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        backgroundColor: T.card,
                        borderColor: T.border,
                        color: T.ink,
                      }}
                    >
                      {loadingMorePosts ? "Loading..." : "Load more posts"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <aside className="sticky top-24 hidden w-[300px] self-start lg:flex flex-col gap-3">
            <MobileWeatherStrip />
            <BAHCard />
            <GateHoursCard />
            <SiteInfoCard />
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
