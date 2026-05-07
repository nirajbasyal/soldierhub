"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T } from "@/lib/theme";
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

const FEED_CACHE_KEY = "soldierhub_feed_cache_v1";

function readCachedFeed() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.posts) ? parsed.posts : [];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const {
    posts,
    currentUser,
    search,
    category,
    setCategory,
    postsLoading,
  } = useApp();

  const [cachedPosts, setCachedPosts] = useState(readCachedFeed);

  useEffect(() => {
    if (!posts.length || typeof window === "undefined") return;

    const postsToCache = posts.slice(0, 30);
    setCachedPosts(postsToCache);

    try {
      window.localStorage.setItem(
        FEED_CACHE_KEY,
        JSON.stringify({ savedAt: Date.now(), posts: postsToCache })
      );
    } catch {
      // Browser storage can fail in private mode or when full. Feed still works normally.
    }
  }, [posts]);

  const feedPosts = posts.length ? posts : cachedPosts;
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

  return (
    <AppShell>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 pb-24 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Main column */}
          <div className="flex flex-col gap-3 min-w-0">
            <div className="block lg:hidden">
              <MobileWeatherStrip />
            </div>

            <FeedHero currentUser={currentUser} postCount={feedPosts.length} />

            <PostComposer />

            <div
              className="sticky top-[73px] z-20 -mx-4 md:mx-0 px-4 md:px-0 py-2 backdrop-blur-xl"
              style={{
                background:
                  "linear-gradient(180deg, rgba(234,240,248,0.96) 0%, rgba(234,240,248,0.82) 100%)",
              }}
            >
              <CategoryStrip
                selected={category}
                counts={counts}
                onSelect={setCategory}
              />
            </div>

            {showInitialSkeleton ? (
              <div className="flex flex-col gap-3">
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="rounded-[24px] border p-8 sh-card-premium"
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
              <div className="-mx-4 md:mx-0 flex flex-col gap-2.5 sh-feed-post-list">
                {filtered.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:flex flex-col gap-4 sticky top-24 self-start">
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
