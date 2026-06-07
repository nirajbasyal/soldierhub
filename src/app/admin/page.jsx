"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Flag,
  Link2,
  Search,
  Shield,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import CircularBackButton from "@/components/ui/CircularBackButton";
import PendingUsersList from "@/components/admin/PendingUsersList";
import ReportedPostsList from "@/components/admin/ReportedPostsList";
import MembersList from "@/components/admin/MembersList";
import BlockedUsersList from "@/components/admin/BlockedUsersList";
import AdminVerifyByEmail from "@/components/admin/AdminVerifyByEmail";
import ResourceManager from "@/components/admin/ResourceManager";
import BoardPrepManager from "@/components/admin/BoardPrepManager";

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export default function AdminPage() {
  const router = useRouter();

  const {
    currentUser,
    authLoading,
    pendingUsers,
    blockedUsers,
    posts,
    users,
  } = useApp();

  const [tab, setTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [resourceCount, setResourceCount] = useState(0);
  const [boardRequestCount, setBoardRequestCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.replace("/");
      return;
    }

    if (currentUser.role !== "admin") {
      router.replace("/");
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    setSearchQuery("");
  }, [tab]);

  useEffect(() => {
    let cancelled = false;

    async function loadBoardRequestCount() {
      if (authLoading || currentUser?.role !== "admin") return;

      try {
        const token = await getAccessToken();
        if (!token) return;

        const res = await fetch("/api/admin/board-prep/requests?status=pending", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setBoardRequestCount((json.data || []).length);
        }
      } catch {
        // Keep the admin dashboard usable even if the badge count cannot load.
      }
    }

    loadBoardRequestCount();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser?.role]);

  if (authLoading) return null;
  if (!currentUser || currentUser.role !== "admin") return null;

  const reportedCount = posts.filter((p) => p.status === "reported").length;
  const memberCount = users.filter((u) => u.role !== "admin").length;
  const blockedCount = blockedUsers?.length || 0;

  const showUserSearch =
    tab === "pending" || tab === "members" || tab === "blocked";

  const tabs = [
    { k: "pending", label: "Pending", icon: UserCheck, count: pendingUsers.length },
    { k: "reported", label: "Reported", icon: Flag, count: reportedCount },
    { k: "members", label: "Members", icon: Users, count: memberCount },
    { k: "blocked", label: "Blocked", icon: UserX, count: blockedCount },
    { k: "resources", label: "Resources", icon: Link2, count: resourceCount },
    { k: "board", label: "Board Prep", icon: BookOpen, count: boardRequestCount },
  ];

  const activeTab = tabs.find((item) => item.k === tab) || tabs[0];

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{ backgroundColor: T.bg }}
      >
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
          <CircularBackButton href="/" label="Back to feed" />

          <div className="mt-6 mb-5">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} style={{ color: T.gold }} />
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: T.gold }}
              >
                Administration
              </span>
            </div>

            <h1
              className="text-3xl md:text-4xl leading-tight font-serif"
              style={{ color: T.navy }}
            >
              Admin dashboard
            </h1>
          </div>

          <AdminVerifyByEmail />

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_230px] md:items-start md:gap-5">
            <aside className="order-1 md:order-2">
              <div
                className="rounded-3xl border p-3 shadow-sm md:sticky md:top-6"
                style={{ backgroundColor: T.card, borderColor: T.border }}
              >
                <div className="mb-2 px-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: T.textSubtle }}>
                    Admin menu
                  </p>
                  <p className="mt-1 text-xs font-semibold" style={{ color: T.textMuted }}>
                    {activeTab.label}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  {tabs.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.k;
                    return (
                      <button
                        key={t.k}
                        onClick={() => setTab(t.k)}
                        className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl px-3 text-left text-sm font-semibold transition-all active:scale-[0.99]"
                        style={{
                          backgroundColor: active ? T.navy : "transparent",
                          color: active ? "#fff" : T.textMuted,
                          boxShadow: active ? "0 8px 22px rgba(11,28,44,0.12)" : "none",
                        }}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon size={16} />
                          <span className="truncate">{t.label}</span>
                        </span>
                        {t.count !== "" && Number(t.count) > 0 && (
                          <span
                            className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-black tabular-nums"
                            style={{
                              backgroundColor: active ? "rgba(255,255,255,0.16)" : T.borderSoft,
                              color: active ? "#fff" : T.textSubtle,
                            }}
                          >
                            {t.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <section className="order-2 min-w-0 md:order-1">
              {showUserSearch && (
                <div
                  className="mb-4 rounded-2xl border p-3"
                  style={{ backgroundColor: T.card, borderColor: T.border }}
                >
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: T.textSubtle }}
                    >
                      <Search size={16} />
                    </span>

                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        tab === "pending"
                          ? "Search pending users by name, email, phone..."
                          : tab === "members"
                          ? "Search verified members by name, email, phone..."
                          : "Search blocked users by name, email, phone..."
                      }
                      className="w-full h-11 rounded-xl border text-sm outline-none pl-10 pr-3"
                      style={{ backgroundColor: T.surface, borderColor: T.border, color: T.text }}
                    />
                  </div>
                </div>
              )}

              <div
                className="rounded-2xl border p-4 md:p-5"
                style={{ backgroundColor: T.card, borderColor: T.border }}
              >
                {tab === "pending" && <PendingUsersList searchQuery={searchQuery} />}
                {tab === "reported" && <ReportedPostsList />}
                {tab === "members" && <MembersList searchQuery={searchQuery} />}
                {tab === "blocked" && <BlockedUsersList searchQuery={searchQuery} />}
                {tab === "resources" && <ResourceManager onCountChange={setResourceCount} />}
                {tab === "board" && <BoardPrepManager onPendingRequestCountChange={setBoardRequestCount} />}
              </div>
            </section>
          </div>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
