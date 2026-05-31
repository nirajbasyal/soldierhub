"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Loader2, Search, UserRound } from "lucide-react";
import { T } from "@/lib/theme";
import { searchVerifiedProfiles } from "@/lib/db/profiles";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import PostCard from "@/components/feed/PostCard";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";

const SEARCH_ACTIVE_COLOR = "#B31942";
const SEARCH_IDLE_COLOR = "#8A5570";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim().toLowerCase());
}

function getPostId(post) {
  return post?.id || post?.post_id || post?.postId || post?.post?.id || null;
}

function getPostAuthorName(post) {
  if (post?.anonymous) return "";
  return post?.author_name || post?.author_name_cached || post?.profile_full_name || post?.full_name || "";
}

function normalizeFeedPostForCard(post) {
  const postId = getPostId(post);
  return {
    ...post,
    id: postId,
    post_id: post?.post_id || postId,
  };
}

function searchPosts(posts = [], query = "") {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return posts
    .filter((post) => {
      const postId = getPostId(post);
      if (!postId) return false;
      if (post?.status === "deleted" || post?.status === "removed") return false;

      return [post.title, post.body, post.category, getPostAuthorName(post)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    })
    .map(normalizeFeedPostForCard);
}

function getProfileAvatarUrl(profile) {
  return profile?.avatar_url || profile?.profile_avatar_url || null;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qFromUrl = String(searchParams?.get("q") || "").trim();
  const tabFromUrl = searchParams?.get("tab") === "members" ? "members" : "posts";

  const {
    currentUser,
    userStatus,
    posts = [],
    postsLoading,
    search = "",
    setSearch = () => {},
    setAuthModal = () => {},
  } = useApp();

  const [localQuery, setLocalQuery] = useState(qFromUrl || search || "");
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [memberResults, setMemberResults] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");

  const cleanQuery = localQuery.trim();
  const isVerified = Boolean(currentUser && userStatus === "verified");
  const postResults = useMemo(() => searchPosts(posts, cleanQuery), [posts, cleanQuery]);

  useEffect(() => {
    setLocalQuery(qFromUrl || "");
    setSearch(qFromUrl || "");
    setActiveTab(tabFromUrl);
  }, [qFromUrl, setSearch, tabFromUrl]);

  useEffect(() => {
    let cancelled = false;
    const q = cleanQuery;

    if (activeTab !== "members") return undefined;

    setMemberError("");

    if (!q || q.length < 2) {
      setMemberResults([]);
      setMemberLoading(false);
      return undefined;
    }

    if (!currentUser) {
      setMemberResults([]);
      setMemberLoading(false);
      setMemberError("Please sign in to search member profiles.");
      return undefined;
    }

    if (!isVerified) {
      setMemberResults([]);
      setMemberLoading(false);
      setMemberError("Verified account required to search member profiles.");
      return undefined;
    }

    setMemberLoading(true);

    const timer = window.setTimeout(async () => {
      const { data, error } = await searchVerifiedProfiles(q, { limit: 12 });

      if (cancelled) return;

      if (error) {
        setMemberResults([]);
        setMemberError(error.message || "Could not search members right now.");
      } else {
        setMemberResults(data || []);
        setMemberError("");
      }

      setMemberLoading(false);
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, cleanQuery, currentUser, isVerified]);

  const updateUrl = (nextQuery = cleanQuery, nextTab = activeTab) => {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextTab === "members") params.set("tab", "members");
    const nextUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.push(nextUrl);
  };

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    setSearch(cleanQuery);
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

  const renderMembers = () => {
    if (!currentUser) {
      return (
        <div className="rounded-[24px] border p-5 text-center shadow-sm" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <UserRound className="mx-auto mb-3" size={34} style={{ color: T.navy }} />
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
        <div className="rounded-[24px] border p-5 text-center shadow-sm" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <UserRound className="mx-auto mb-3" size={34} style={{ color: T.navy }} />
          <h2 className="text-lg font-extrabold" style={{ color: T.text }}>Verification required</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6" style={{ color: T.textSubtle }}>
            To protect privacy, only verified members can search other verified profiles.
          </p>
        </div>
      );
    }

    if (!cleanQuery || cleanQuery.length < 2) {
      return (
        <EmptyState
          icon={UserRound}
          title="Search members by name or email"
          body="Type at least 2 letters for a name, or enter an exact email address."
        />
      );
    }

    if (memberLoading) {
      return (
        <div className="rounded-[24px] border p-6 text-center shadow-sm" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <Loader2 className="mx-auto animate-spin" size={28} style={{ color: T.navy }} />
          <p className="mt-3 text-sm font-semibold" style={{ color: T.textSubtle }}>Searching members…</p>
        </div>
      );
    }

    if (memberError) {
      return (
        <EmptyState
          icon={UserRound}
          title="Member search unavailable"
          body={memberError}
        />
      );
    }

    if (memberResults.length === 0) {
      return (
        <EmptyState
          icon={UserRound}
          title="No members found"
          body={isEmail(cleanQuery) ? "No verified member matched that exact email." : `No verified member names matched "${cleanQuery}".`}
        />
      );
    }

    return (
      <div className="flex flex-col gap-2.5">
        {memberResults.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => openProfile(profile)}
            className="flex w-full items-center gap-3 rounded-[22px] border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
            style={{ backgroundColor: T.card, borderColor: T.border }}
          >
            <Avatar
              name={profile.full_name || "SoldierHub member"}
              color={profile.avatar_color}
              src={getProfileAvatarUrl(profile)}
              size={46}
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
          </button>
        ))}
      </div>
    );
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-[760px] px-3 pb-24 pt-3 sm:px-5 md:pt-7">
        <section className="rounded-[28px] border p-4 shadow-sm md:p-5" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.18em]" style={{ color: T.textSubtle }}>
                Search Soldier Hub
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl" style={{ color: T.text }}>
                Find posts or members
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: cleanQuery ? SEARCH_ACTIVE_COLOR : SEARCH_IDLE_COLOR }} />
              <input
                value={localQuery}
                onChange={(event) => setLocalQuery(event.target.value)}
                placeholder="Search posts, names, or exact email"
                autoComplete="off"
                inputMode="search"
                enterKeyHint="search"
                className="h-12 w-full rounded-full border pl-11 pr-14 text-[15px] font-semibold outline-none transition"
                style={{
                  backgroundColor: "#F8FAFD",
                  borderColor: T.border,
                  color: T.text,
                  boxShadow: "0 8px 18px rgba(7,27,51,0.035)",
                }}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border text-white transition active:scale-95"
                style={{ backgroundColor: T.navy, borderColor: "rgba(49,74,102,0.18)" }}
                aria-label="Run search"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

          <div className="mt-4 grid grid-cols-2 rounded-full border p-1" style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft }}>
            <button
              type="button"
              onClick={() => setTab("posts")}
              className="flex h-10 items-center justify-center gap-2 rounded-full text-sm font-extrabold transition"
              style={{ backgroundColor: activeTab === "posts" ? "#FFFFFF" : "transparent", color: activeTab === "posts" ? T.navy : T.textSubtle, boxShadow: activeTab === "posts" ? "0 8px 18px rgba(7,27,51,0.08)" : "none" }}
            >
              <FileText size={16} />
              Posts
            </button>
            <button
              type="button"
              onClick={() => setTab("members")}
              className="flex h-10 items-center justify-center gap-2 rounded-full text-sm font-extrabold transition"
              style={{ backgroundColor: activeTab === "members" ? "#FFFFFF" : "transparent", color: activeTab === "members" ? T.navy : T.textSubtle, boxShadow: activeTab === "members" ? "0 8px 18px rgba(7,27,51,0.08)" : "none" }}
            >
              <UserRound size={16} />
              Members
            </button>
          </div>
        </section>

        <section className="mt-3">
          {activeTab === "posts" ? (
            !cleanQuery ? (
              <EmptyState
                icon={Search}
                title="Search posts"
                body="Type a word, topic, category, or author name to find matching posts."
              />
            ) : postsLoading ? (
              <div className="rounded-[24px] border p-6 text-center shadow-sm" style={{ backgroundColor: T.card, borderColor: T.border }}>
                <Loader2 className="mx-auto animate-spin" size={28} style={{ color: T.navy }} />
                <p className="mt-3 text-sm font-semibold" style={{ color: T.textSubtle }}>Loading posts…</p>
              </div>
            ) : postResults.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No posts found"
                body={`No posts matched "${cleanQuery}".`}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {postResults.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )
          ) : (
            renderMembers()
          )}
        </section>
      </main>
    </AppShell>
  );
}
