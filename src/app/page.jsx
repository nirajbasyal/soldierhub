"use client";

import { useMemo } from "react";
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

export default function HomePage() {
  const {
    posts,
    currentUser,
    search,
    category,
    setCategory,
    postsLoading,
  } = useApp();

  const counts = useMemo(() => {
    const c = { All: posts.length };

    CATEGORIES.forEach((cat) => {
      if (cat.key !== "All") {
        c[cat.key] = posts.filter((p) => p.category === cat.key).length;
      }
    });

    return c;
  }, [posts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return posts.filter((p) => {
      if (category !== "All" && p.category !== category) return false;

      if (!q) return true;

      return (
        p.title.toLowerCase().includes(q) ||
        (p.body || "").toLowerCase().includes(q) ||
        (p.author_name || "").toLowerCase().includes(q)
      );
    });
  }, [posts, category, search]);

  return (
    <AppShell>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 pb-24 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Main column */}
          <div className="flex flex-col gap-3 min-w-0">
            <div className="block lg:hidden">
              <MobileWeatherStrip />
            </div>

            <FeedHero currentUser={currentUser} postCount={posts.length} />

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

            {postsLoading ? (
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
