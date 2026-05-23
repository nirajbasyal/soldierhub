"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Search, UsersRound } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import * as Follows from "@/lib/supabase/follows";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Avatar from "@/components/ui/Avatar";

function ConnectionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, authLoading, setAuthModal } = useApp();
  const initialTab = searchParams.get("tab") === "following" ? "following" : "followers";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState({ followers: [], following: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    async function loadList() {
      if (!currentUser?.id) return;
      setLoading(true);
      setError("");
      const { data, error: listError } = await Follows.listFollowConnections(activeTab, currentUser.id, {
        limit: 100,
        skipCache: true,
      });
      setLoading(false);
      if (listError) {
        setError(listError.message || "Could not load this list.");
        return;
      }
      setItems((previous) => ({ ...previous, [activeTab]: data || [] }));
    }

    loadList();
  }, [activeTab, currentUser?.id]);

  const visibleItems = useMemo(() => {
    const rawItems = items[activeTab] || [];
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return rawItems;

    return rawItems.filter((item) => {
      const profile = item.profile || item;
      const haystack = `${profile.full_name || ""} ${profile.base || ""}`.toLowerCase();
      return haystack.includes(cleanQuery);
    });
  }, [activeTab, items, query]);

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
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D5E2F2] bg-white text-[#0B1C2C] shadow-sm"
              aria-label="Back to profile"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="truncate text-lg font-black tracking-[-0.03em]" style={{ color: T.navy }}>
                Connections
              </h1>
              <p className="text-xs font-semibold" style={{ color: T.textMuted }}>
                Followers and following
              </p>
            </div>
            <div className="h-10 w-10" />
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
            </div>

            <div className="min-h-[320px] p-3">
              {loading ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-sm font-bold text-slate-500">
                  <Loader2 className="mb-3 animate-spin" size={22} />
                  Loading {activeTab}...
                </div>
              ) : error ? (
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
                  {visibleItems.map((item) => {
                    const profile = item.profile || item;
                    return (
                      <div key={profile.id} className="flex items-center gap-3 rounded-3xl border border-[#E4EDF7] bg-white p-3 transition hover:bg-[#F4F8FD]">
                        <Avatar name={profile.full_name} color={profile.avatar_color} src={profile.avatar_url} size={46} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black" style={{ color: T.navy }}>
                            {profile.full_name || "Soldier Hub member"}
                          </div>
                          <div className="truncate text-xs font-semibold" style={{ color: T.textMuted }}>
                            {profile.base || "Fort Bliss"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
