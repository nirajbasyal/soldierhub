"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, UserRound } from "lucide-react";
import { T } from "@/lib/theme";
import * as PostsDB from "@/lib/db/posts";
import { searchVerifiedProfiles } from "@/lib/db/profiles";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import PostCard from "@/components/feed/PostCard";
import Avatar from "@/components/ui/Avatar";
import PostSkeleton from "@/components/ui/PostSkeleton";

const SEARCH_ACTIVE_COLOR = "#B31942";
const SEARCH_IDLE_COLOR = "#8A5570";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALL_POST_LIMIT = 5;
const ALL_MEMBER_LIMIT = 5;
const POST_PAGE_LIMIT = 20;
const MEMBER_PAGE_LIMIT = 12;

function isEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim().toLowerCase());
}

function getPostId(post) {
  return post?.id || post?.post_id || post?.postId || post?.post?.id || null;
}

function normalizeFeedPostForCard(post) {
  const postId = getPostId(post);
  return {
    ...post,
    id: postId,
    post_id: post?.post_id || postId,
  };
}

function getProfileAvatarUrl(profile) {
  return profile?.avatar_url || profile?.profile_avatar_url || null;
}

function parseTab(value) {
  if (value === "posts" || value === "members") return value;
  return "all";
}

function mergeUniqueById(currentRows = [], nextRows = []) {
  const seen = new Set();
  return [...currentRows, ...nextRows].filter((row) => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function SearchStatusCard({ title, body, icon: Icon = Search }) {
  return (
    <div
      className="overflow-hidden rounded-[28px] border p-4 shadow-sm md:p-5"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, rgba(61,111,151,0.08) 0%, rgba(255,255,255,0.98) 46%, rgba(248,251,255,0.98) 100%)",
        borderColor: "rgba(207,218,232,0.92)",
        boxShadow: "0 14px 34px rgba(7,27,51,0.07)",
      }}
    >
      <div className="mx-auto flex max-w-sm flex-col items-center py-5 text-center md:py-7">
        <div
          className="mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-[20px] border shadow-sm"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F3F7FC 100%)",
            borderColor: "rgba(207,218,232,0.9)",
            color: T.blue,
            boxShadow: "0 12px 24px rgba(49,74,102,0.09)",
          }}
        >
          <Icon size={28} strokeWidth={2.35} />
        </div>

        <h2 className="text-[20px] font-black tracking-[-0.04em]" style={{ color: T.text }}>
          {title}
        </h2>
        <p className="mt-2 text-[14px] font-semibold leading-6" style={{ color: T.textSubtle }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function LoadMoreButton({ loading, disabled, onClick, label = "Load more" }) {
  if (disabled && !loading) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="mx-auto mt-2 inline-flex min-h-[42px] items-center justify-center rounded-full border px-5 text-sm font-extrabold shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "rgba(207,218,232,0.92)",
        color: T.blue,
        boxShadow: "0 10px 22px rgba(7,27,51,0.06)",
      }}
    >
      {loading ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
      {loading ? "Loading…" : label}
    </button>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qFromUrl = String(searchParams?.get("q") || "").trim();
  const tabFromUrl = parseTab(searchParams?.get("tab"));

  const { currentUser, userStatus, setAuthModal = () => {} } = useApp();

  const [localQuery, setLocalQuery] = useState(qFromUrl);
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [postResults, setPostResults] = useState([]);
  const [postLoading, setPostLoading] = useState(false);
  const [postLoadingMore, setPostLoadingMore] = useState(false);
  const [postHasMore, setPostHasMore] = useState(false);
  const [postError, setPostError] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberLoadingMore, setMemberLoadingMore] = useState(false);
  const [memberHasMore, setMemberHasMore] = useState(false);
  const [memberError, setMemberError] = useState("");

  const cleanQuery = localQuery.trim();
  const isVerified = Boolean(currentUser && userStatus === "verified");
  const shouldSearchPosts = cleanQuery.length >= 2 && (activeTab === "posts" || activeTab === "all");
  const shouldSearchMembers = cleanQuery.length >= 2 && (activeTab === "members" || activeTab === "all");
  const activePostLimit = activeTab === "all" ? ALL_POST_LIMIT : POST_PAGE_LIMIT;
  const activeMemberLimit = activeTab === "all" ? ALL_MEMBER_LIMIT : MEMBER_PAGE_LIMIT;

  const postResultsCount = postResults.length;
  const memberResultsCount = memberResults.length;
  const searchTabs = useMemo(
    () => [
      { key: "all", label: "All", count: postResultsCount + memberResultsCount },
      { key: "posts", label: "Posts", count: postResultsCount },
      { key: "members", label: "Members", count: memberResultsCount },
    ],
    [memberResultsCount, postResultsCount]
  );

  useEffect(() => {
    setLocalQuery(qFromUrl);
    setActiveTab(tabFromUrl);
  }, [qFromUrl, tabFromUrl]);

  useEffect(() => {
    let cancelled = false;

    if (!shouldSearchPosts) {
      setPostResults([]);
      setPostLoading(false);
      setPostLoadingMore(false);
      setPostHasMore(false);
      setPostError("");
      return undefined;
    }

    setPostLoading(true);
    setPostError("");

    const timer = window.setTimeout(async () => {
      const { data, error } = await PostsDB.searchPostsForSearchPage(cleanQuery, {
        limit: activePostLimit,
        offset: 0,
      });

      if (cancelled) return;

      if (error) {
        setPostResults([]);
        setPostHasMore(false);
        setPostError(error.message || "Could not search posts right now.");
      } else {
        const rows = (data || []).map(normalizeFeedPostForCard);
        setPostResults(rows);
        setPostHasMore(rows.length === activePostLimit);
        setPostError("");
      }

      setPostLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [shouldSearchPosts, cleanQuery, activePostLimit]);

  useEffect(() => {
    let cancelled = false;

    if (!shouldSearchMembers) {
      setMemberResults([]);
      setMemberLoading(false);
      setMemberLoadingMore(false);
      setMemberHasMore(false);
      setMemberError("");
      return undefined;
    }

    setMemberError("");

    if (!currentUser) {
      setMemberResults([]);
      setMemberLoading(false);
      setMemberHasMore(false);
      setMemberError("Please sign in to search member profiles.");
      return undefined;
    }

    if (!isVerified) {
      setMemberResults([]);
      setMemberLoading(false);
      setMemberHasMore(false);
      setMemberError("Verified account required to search member profiles.");
      return undefined;
    }

    setMemberLoading(true);

    const timer = window.setTimeout(async () => {
      const { data, error } = await searchVerifiedProfiles(cleanQuery, {
        limit: activeMemberLimit,
        offset: 0,
      });

      if (cancelled) return;

      if (error) {
        setMemberResults([]);
        setMemberHasMore(false);
        setMemberError(error.message || "Could not search members right now.");
      } else {
        const rows = data || [];
        setMemberResults(rows);
        setMemberHasMore(!isEmail(cleanQuery) && rows.length === activeMemberLimit);
        setMemberError("");
      }

      setMemberLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [shouldSearchMembers, cleanQuery, activeMemberLimit, currentUser, isVerified]);

  const updateUrl = (nextQuery = cleanQuery, nextTab = activeTab) => {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextTab !== "all") params.set("tab", nextTab);
    const nextUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.push(nextUrl);
  };

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    updateUrl(cleanQuery, activeTab);
  };

  const setTab = (tab) => {
    setActiveTab(tab);
    updateUrl(cleanQuery, tab);
  };

  const openProfile = (profile) => {
    if (!profile?.id) return;
    if (profile.id === currentUser?.id) {
      router.push("/profile");
      return;
    }

    router.push(
      `/profile/${encodeURIComponent(profile.id)}?name=${encodeURIComponent(profile.full_name || "SoldierHub member")}`
    );
  };

  const loadMorePosts = async () => {
    if (postLoadingMore || postLoading || !postHasMore || cleanQuery.length < 2) return;

    setPostLoadingMore(true);
    const { data, error } = await PostsDB.searchPostsForSearchPage(cleanQuery, {
      limit: POST_PAGE_LIMIT,
      offset: postResults.length,
    });

    if (error) {
      setPostError(error.message || "Could not load more posts.");
    } else {
      const rows = (data || []).map(normalizeFeedPostForCard);
      setPostResults((current) => mergeUniqueById(current, rows));
      setPostHasMore(rows.length === POST_PAGE_LIMIT);
      setPostError("");
    }

    setPostLoadingMore(false);
  };

  const loadMoreMembers = async () => {
    if (memberLoadingMore || memberLoading || !memberHasMore || cleanQuery.length < 2) return;

    setMemberLoadingMore(true);
    const { data, error } = await searchVerifiedProfiles(cleanQuery, {
      limit: MEMBER_PAGE_LIMIT,
      offset: memberResults.length,
    });

    if (error) {
      setMemberError(error.message || "Could not load more members.");
    } else {
      const rows = data || [];
      setMemberResults((current) => mergeUniqueById(current, rows));
      setMemberHasMore(rows.length === MEMBER_PAGE_LIMIT);
      setMemberError("");
    }

    setMemberLoadingMore(false);
  };

  const renderPostResults = ({ showTitle = false } = {}) => {
    if (!cleanQuery || cleanQuery.length < 2) {
      return (
        <SearchStatusCard
          icon={Search}
          title="Search posts"
          body="Type at least 2 letters to find matching posts from the community feed."
        />
      );
    }

    if (postResults.length === 0 && postLoading) {
      return (
        <div className="flex flex-col gap-3">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      );
    }

    if (postResults.length === 0) {
      return (
        <SearchStatusCard
          icon={Search}
          title="No posts found"
          body={postError || `No posts matched "${cleanQuery}".`}
        />
      );
    }

    return (
      <div className="flex flex-col gap-2.5">
        {showTitle ? (
          <div className="flex items-center justify-between px-2 pb-0.5">
            <h2 className="text-[12px] font-black uppercase tracking-[0.18em]" style={{ color: T.textSubtle }}>
              Posts
            </h2>
            {postLoading ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: T.textSubtle }}>
                <Loader2 size={12} className="animate-spin" /> Refreshing
              </span>
            ) : null}
          </div>
        ) : null}

        {postError ? (
          <p className="px-2 text-xs font-semibold" style={{ color: SEARCH_ACTIVE_COLOR }}>
            {postError}
          </p>
        ) : null}

        <div className="sh-feed-post-list mx-0 flex w-full scroll-mt-24 flex-col gap-3">
          {postResults.map((post) => {
            const normalizedPost = normalizeFeedPostForCard(post);
            return <PostCard key={normalizedPost.id} post={normalizedPost} />;
          })}
        </div>

        {activeTab === "posts" ? (
          <LoadMoreButton
            loading={postLoadingMore}
            disabled={!postHasMore}
            onClick={loadMorePosts}
            label="Load more posts"
          />
        ) : null}
      </div>
    );
  };

  const renderMembers = ({ showTitle = false } = {}) => {
    if (!cleanQuery || cleanQuery.length < 2) {
      return (
        <SearchStatusCard
          icon={UserRound}
          title="Search members"
          body="Type at least 2 letters for a name, or enter an exact email address."
        />
      );
    }

    if (!currentUser) {
      return (
        <div
          className="rounded-[28px] border p-5 text-center shadow-sm"
          style={{ backgroundColor: T.card, borderColor: T.border }}
        >
          <UserRound className="mx-auto mb-3" size={32} style={{ color: T.navy }} />
          <h2 className="text-lg font-extrabold" style={{ color: T.text }}>Sign in to search members</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6" style={{ color: T.textSubtle }}>
            Member profile search is available to signed-in verified Soldier Hub users.
          </p>
          <button
            type="button"
            onClick={() => setAuthModal("login")}
            className="mt-4 rounded-full px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition active:scale-[0.98]"
            style={{ backgroundColor: T.navy }}
          >
            Sign in
          </button>
        </div>
      );
    }

    if (!isVerified) {
      return (
        <SearchStatusCard
          icon={UserRound}
          title="Verification required"
          body="To protect privacy, only verified members can search other verified profiles."
        />
      );
    }

    if (memberResults.length === 0 && memberLoading) {
      return (
        <div
          className="rounded-[28px] border p-5 text-center shadow-sm"
          style={{ backgroundColor: T.card, borderColor: T.border }}
        >
          <Loader2 className="mx-auto animate-spin" size={26} style={{ color: T.navy }} />
          <p className="mt-3 text-sm font-semibold" style={{ color: T.textSubtle }}>Searching members…</p>
        </div>
      );
    }

    if (memberError && memberResults.length === 0) {
      return (
        <SearchStatusCard
          icon={UserRound}
          title="Member search unavailable"
          body={memberError}
        />
      );
    }

    if (memberResults.length === 0) {
      return (
        <SearchStatusCard
          icon={UserRound}
          title="No members found"
          body={isEmail(cleanQuery) ? "No verified member matched that exact email." : `No verified member names matched "${cleanQuery}".`}
        />
      );
    }

    return (
      <div className="flex flex-col gap-2.5">
        {showTitle ? (
          <div className="flex items-center justify-between px-2 pb-0.5">
            <h2 className="text-[12px] font-black uppercase tracking-[0.18em]" style={{ color: T.textSubtle }}>
              Members
            </h2>
            {memberLoading ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: T.textSubtle }}>
                <Loader2 size={12} className="animate-spin" /> Refreshing
              </span>
            ) : null}
          </div>
        ) : null}

        {memberError ? (
          <p className="px-2 text-xs font-semibold" style={{ color: SEARCH_ACTIVE_COLOR }}>
            {memberError}
          </p>
        ) : null}

        <div className="flex flex-col gap-2.5">
          {memberResults.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => openProfile(profile)}
              className="flex w-full items-center gap-3 rounded-[24px] border p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
                borderColor: "rgba(207,218,232,0.92)",
                boxShadow: "0 12px 26px rgba(7,27,51,0.055)",
              }}
            >
              <Avatar
                name={profile.full_name || "SoldierHub member"}
                color={profile.avatar_color}
                src={getProfileAvatarUrl(profile)}
                size={48}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-extrabold" style={{ color: T.text }}>
                  {profile.full_name || "SoldierHub member"}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold" style={{ color: T.textSubtle }}>
                  <span>{profile.base || "Fort Bliss"}</span>
                  {profile.match_type === "email" ? <span>• exact email match</span> : null}
                </div>
              </div>
              <span className="text-xl font-light" style={{ color: T.textSubtle }}>
                ›
              </span>
            </button>
          ))}
        </div>

        {activeTab === "members" ? (
          <LoadMoreButton
            loading={memberLoadingMore}
            disabled={!memberHasMore}
            onClick={loadMoreMembers}
            label="Load more members"
          />
        ) : null}
      </div>
    );
  };

  const renderAllResults = () => {
    if (!cleanQuery || cleanQuery.length < 2) {
      return (
        <SearchStatusCard
          icon={Search}
          title="Search Soldier Hub"
          body="Find community posts by topic, and search verified members by name or exact email."
        />
      );
    }

    const hasPostResults = postResults.length > 0;
    const hasMemberResults = memberResults.length > 0;
    const isCheckingResults = postLoading || memberLoading;

    if (hasPostResults || hasMemberResults) {
      return (
        <div className="flex flex-col gap-4">
          {hasPostResults ? renderPostResults({ showTitle: true }) : null}
          {hasMemberResults ? renderMembers({ showTitle: true }) : null}
        </div>
      );
    }

    if (isCheckingResults) return null;

    return (
      <SearchStatusCard
        icon={Search}
        title="No results found"
        body={`No posts or members matched "${cleanQuery}".`}
      />
    );
  };

  return (
    <AppShell hideNav>
      <main className="mx-auto w-full max-w-[640px] px-0 pb-24 pt-0 sm:px-5 md:pt-4">
        <section
          className="sticky top-0 z-30 border-b px-3 pb-0 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-xl sm:rounded-b-[24px] sm:border sm:px-4 sm:shadow-sm"
          style={{
            backgroundColor: "rgba(255,255,255,0.96)",
            borderColor: "rgba(207,218,232,0.92)",
            boxShadow: "0 8px 22px rgba(7,27,51,0.05)",
          }}
        >
          <div className="relative flex h-9 items-center justify-center">
            <h1 className="text-[18px] font-black tracking-[-0.025em]" style={{ color: T.text }}>
              Search Results
            </h1>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="absolute right-0 rounded-full px-1.5 py-1 text-[15px] font-bold transition active:scale-[0.98]"
              style={{ color: T.blue }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-1.5">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: cleanQuery ? SEARCH_ACTIVE_COLOR : SEARCH_IDLE_COLOR }}
              />
              <input
                value={localQuery}
                onChange={(event) => setLocalQuery(event.target.value)}
                placeholder="Search posts or members"
                autoComplete="off"
                inputMode="search"
                enterKeyHint="search"
                className="h-[38px] w-full rounded-[14px] border pl-9 pr-3 text-[16px] font-semibold outline-none transition placeholder:font-semibold"
                style={{
                  backgroundColor: "#F0F2F5",
                  borderColor: "rgba(207,218,232,0.72)",
                  color: T.text,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.78)",
                }}
              />
            </div>
          </form>

          <div className="mt-1 grid grid-cols-3" style={{ borderColor: "rgba(207,218,232,0.92)" }}>
            {searchTabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTab(tab.key)}
                  className="relative flex h-10 items-center justify-center gap-1 text-[15px] font-bold transition active:scale-[0.98]"
                  style={{ color: active ? T.blue : "#7A7F87" }}
                >
                  <span>{tab.label}</span>
                  {cleanQuery.length >= 2 && tab.count > 0 ? (
                    <span
                      className="rounded-full px-1 py-0.5 text-[9px] font-black"
                      style={{
                        backgroundColor: active ? T.brandBlueSoft : "#EEF3F8",
                        color: active ? T.blue : T.textSubtle,
                      }}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  ) : null}
                  {active ? (
                    <span
                      className="absolute bottom-0 left-1/2 h-[3px] w-20 max-w-[76%] -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: T.blue }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-3 px-3 sm:px-0">
          {activeTab === "all"
            ? renderAllResults()
            : activeTab === "members"
              ? renderMembers()
              : renderPostResults()}
        </section>
      </main>
    </AppShell>
  );
}
