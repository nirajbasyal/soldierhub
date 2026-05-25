"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Search, UserMinus, UsersRound } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import * as Follows from "@/lib/supabase/follows";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Avatar from "@/components/ui/Avatar";

const PAGE_SIZE = 20;

function getProfileFromItem(item) {
  return item?.profile || item?.profiles || item?.following_profile || item?.follower_profile || item || {};
}

function FollowListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="flex items-center gap-3 rounded-3xl border border-[#E4EDF7] bg-white p-3">
          <div className="h-[46px] w-[46px] shrink-0 animate-pulse rounded-full bg-[#DDE6EF]" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-40 max-w-full animate-pulse rounded-full bg-[#DDE6EF]" />
            <div className="mt-2 h-3 w-24 max-w-full animate-pulse rounded-full bg-[#E8EEF5]" />
          </div>
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[#E8EEF5]" />
        </div>
      ))}
    </div>
  );
}

function ConnectionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, authLoading, setAuthModal, pushToast } = useApp();
  const initialTab = searchParams.get("tab") === "following" ? "following" : "followers";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState({ followers: [], following: [] });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState({ followers: false, following: false });
  const [nextOffset, setNextOffset] = useState({ followers: 0, following: 0 });
  const [totalCount, setTotalCount] = useState({ followers: null, following: null });
  const [error, setError] = useState("");
  const [unfollowingId, setUnfollowingId] = useState("");

  useEffect(() => {
    const nextTab = searchParams.get("tab") === "following" ? "following" : "followers";
    setActiveTab(nextTab);
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.replace("/");
      setAuthModal?.("login");
    }
  }, [authLoading, currentUser, router, setAuthModal]);

  const loadList = useCallback(
    async (tab, { append = false, forceFresh = false, offsetOverride = 0 } = {}) => {
      if (!currentUser?.id) return;

      const offset = append ? Math.max(0, Number(offsetOverride) || 0) : 0;
      const cachedItems = !append && !forceFresh ? Follows.getCachedFollowConnections?.(tab, currentUser.id) : null;

      setError("");

      if (append) {
        setLoadingMore(true);
      } else if (cachedItems?.length > 0) {
        setItems((previous) => ({ ...previous, [tab]: cachedItems }));
        setNextOffset((previous) => ({ ...previous, [tab]: cachedItems.length }));
        setLoading(false);
        setRefreshing(true);
      } else {
        setLoading(true);
        setRefreshing(false);
      }

      const { data, error: listError, hasMore: moreAvailable, nextOffset: next, totalCount: total } =
        await Follows.listFollowConnections(tab, currentUser.id, {
          limit: PAGE_SIZE,
          offset,
          skipCache: forceFresh || append || Boolean(cachedItems?.length),
        });

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);

      if (listError) {
        setError(listError.message || "Could not load this list.");
        return;
      }

      setItems((previous) => {
        const previousItems = append ? previous[tab] || [] : [];
        const seen = new Set(previousItems.map((item) => Follows.getConnectionProfileId?.(item)).filter(Boolean));
        const merged = [
          ...previousItems,
          ...(data || []).filter((item) => {
            const id = Follows.getConnectionProfileId?.(item);
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          }),
        ];
        return { ...previous, [tab]: merged };
      });

      setHasMore((previous) => ({ ...previous, [tab]: Boolean(moreAvailable) }));
      setNextOffset((previous) => ({ ...previous, [tab]: Number(next) || offset + (data?.length || 0) }));
      setTotalCount((previous) => ({ ...previous, [tab]: total ?? previous[tab] }));
    },
    [currentUser?.id]
  );

  useEffect(() => {
    loadList(activeTab);
  }, [activeTab, loadList]);

  const visibleItems = useMemo(() => {
    const rawItems = items[activeTab] || [];
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return rawItems;

    return rawItems.filter((item) => {
      const profile = getProfileFromItem(item);
      const haystack = `${profile.full_name || ""} ${profile.base || ""}`.toLowerCase();
      return haystack.includes(cleanQuery);
    });
  }, [activeTab, items, query]);

  const openProfile = (profile) => {
    if (!profile?.id) return;
    if (profile.id === currentUser?.id) {
      router.push("/profile");
      return;
    }
    router.push(`/profile/${profile.id}?name=${encodeURIComponent(profile.full_name || "Soldier Hub member")}`);
  };

  const handleUnfollow = async (profile) => {
    if (!profile?.id || unfollowingId) return;

    const previousFollowing = items.following || [];
    setUnfollowingId(profile.id);
    setItems((previous) => ({
      ...previous,
      following: previous.following.filter((item) => getProfileFromItem(item)?.id !== profile.id),
    }));

    const { error: unfollowError } = await Follows.unfollowUser(profile.id);
    setUnfollowingId("");

    if (unfollowError) {
      setItems((previous) => ({ ...previous, following: previousFollowing }));
      pushToast?.(unfollowError.message || "Could not unfollow this member.", "error");
      return;
    }

    pushToast?.("Member unfollowed.", "success");
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore[activeTab]) return;
    loadList(activeTab, {
      append: true,
      forceFresh: true,
      offsetOverride: nextOffset[activeTab] || items[activeTab]?.length || 0,
    });
  };

  const tabClasses = (tab) =>
    `flex-1 rounded-2xl px-4 py-3 text-sm font-black transition ${
      activeTab === tab ? "bg-[#0B1C2C] text-white shadow-sm" : "text-slate-600 hover:bg-[#DCE8F7]"
    }`;

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.9), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)",
        }}
      >
        <div className="mx-auto w-full max-w-[660px] px-3 py-4 sm:px-5 md:px-6 md:py-6">
          <div className="mb-4 flex items-center justify-start">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D5E2F2] bg-white text-[#0B1C2C] shadow-sm"
              aria-label="Back to profile"
            >
              <ArrowLeft size={18} />
            </button>
          </div>

          <section className="overflow-hidden rounded-[28px] border border-[#D5E2F2] bg-white shadow-[0_18px_42px_rgba(7,27,51,0.09)]">
            <div className="border-b border-[#E4EDF7] p-3">
              <div className="flex gap-2 rounded-[22px] bg-[#F4F8FD] p-1.5">
                <button type="button" onClick={() => setActiveTab("followers")} className={tabClasses("followers")}>
                  Followers
                </button>
                <button type="button" onClick={() => setActiveTab("following")} className={tabClasses("following")}>
                  Following
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#D5E2F2] bg-white px-3 py-2.5">
                <Search size={17} className="shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${activeTab}`}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="mt-2 flex min-h-5 items-center justify-between gap-3 px-1 text-[11px] font-bold text-slate-500">
                <span>
                  {typeof totalCount[activeTab] === "number"
                    ? `Showing ${items[activeTab]?.length || 0} of ${totalCount[activeTab]}`
                    : `${items[activeTab]?.length || 0} loaded`}
                </span>
                {refreshing ? (
                  <span className="inline-flex items-center gap-1 text-[#1E4E8C]">
                    <Loader2 size={11} className="animate-spin" /> Refreshing
                  </span>
                ) : null}
              </div>
            </div>

            <div className="min-h-[320px] p-3">
              {loading ? (
                <FollowListSkeleton />
              ) : error && visibleItems.length === 0 ? (
                <div className="rounded-3xl border border-[#F3C7D1] bg-[#FDECF0]/80 p-4 text-sm font-bold text-[#B31942]">
                  {error}
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-[#DCE8F7] text-[#1E4E8C]">
                    <UsersRound size={24} />
                  </div>
                  <h2 className="text-base font-black" style={{ color: T.navy }}>
                    No {activeTab} found
                  </h2>
                  <p className="mt-1 max-w-xs text-sm leading-6" style={{ color: T.textMuted }}>
                    {query ? "Try a different search." : `Your ${activeTab} list will show here.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {error ? (
                    <div className="rounded-2xl border border-[#F3C7D1] bg-[#FDECF0]/80 p-3 text-xs font-bold text-[#B31942]">
                      {error}
                    </div>
                  ) : null}

                  {visibleItems.map((item) => {
                    const profile = getProfileFromItem(item);
                    const isUnfollowing = unfollowingId === profile.id;
                    return (
                      <div key={profile.id} className="flex items-center gap-3 rounded-3xl border border-[#E4EDF7] bg-white p-3 transition hover:bg-[#F4F8FD]">
                        <button type="button" onClick={() => openProfile(profile)} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4E8C]" aria-label={`Open ${profile.full_name || "member"} profile`}>
                          <Avatar name={profile.full_name} color={profile.avatar_color} src={profile.avatar_url} size={46} />
                        </button>
                        <button type="button" onClick={() => openProfile(profile)} className="min-w-0 flex-1 text-left focus-visible:outline-none">
                          <div className="truncate text-sm font-black transition-colors hover:text-[#1E4E8C]" style={{ color: T.navy }}>
                            {profile.full_name || "Soldier Hub member"}
                          </div>
                          <div className="truncate text-xs font-semibold" style={{ color: T.textMuted }}>
                            {profile.base || "Fort Bliss"}
                          </div>
                        </button>

                        {activeTab === "following" ? (
                          <button
                            type="button"
                            onClick={() => handleUnfollow(profile)}
                            disabled={isUnfollowing}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#F3C7D1] bg-[#FDECF0]/80 text-[#B31942] transition hover:bg-[#FADBE3] disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Unfollow ${profile.full_name || "member"}`}
                          >
                            {isUnfollowing ? <Loader2 size={15} className="animate-spin" /> : <UserMinus size={16} />}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}

                  {!query && hasMore[activeTab] ? (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D5E2F2] bg-[#F4F8FD] px-4 py-3 text-sm font-black text-[#0B1C2C] transition hover:bg-[#DCE8F7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMore ? <Loader2 size={15} className="animate-spin" /> : null}
                      {loadingMore ? "Loading more..." : "Load more"}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}

export default function ProfileConnectionsPage() {
  return (
    <Suspense fallback={null}>
      <ConnectionsContent />
    </Suspense>
  );
}
