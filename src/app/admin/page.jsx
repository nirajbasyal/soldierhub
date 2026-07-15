"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
  DoorOpen,
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
import { getAdminMfaState } from "@/lib/admin/mfa";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import CircularBackButton from "@/components/ui/CircularBackButton";
import PageLoadingState from "@/components/ui/PageLoadingState";
import AdminVerifyByEmail from "@/components/admin/AdminVerifyByEmail";

// Tab panels load on demand so the admin page doesn't ship every manager
// bundle up front — only the active tab's code is downloaded.
const managerLoading = () => <PageLoadingState title="Loading section" subtitle="One moment..." mode="admin" />;
const PendingUsersList = dynamic(() => import("@/components/admin/PendingUsersList"), { loading: managerLoading });
const ReportedPostsList = dynamic(() => import("@/components/admin/ReportedPostsList"), { loading: managerLoading });
const MembersList = dynamic(() => import("@/components/admin/MembersList"), { loading: managerLoading });
const BlockedUsersList = dynamic(() => import("@/components/admin/BlockedUsersList"), { loading: managerLoading });
const ResourceManager = dynamic(() => import("@/components/admin/ResourceManager"), { loading: managerLoading });
const BoardPrepManager = dynamic(() => import("@/components/admin/BoardPrepManager"), { loading: managerLoading });
const GateManager = dynamic(() => import("@/components/admin/GateManager"), { loading: managerLoading });
const AuditLogs = dynamic(() => import("@/components/admin/AuditLogs"), { loading: managerLoading });

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
    users,
  } = useApp();

  const [tab, setTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [resourceCount, setResourceCount] = useState(0);
  const [gateCount, setGateCount] = useState(0);
  const [boardRequestCount, setBoardRequestCount] = useState(0);
  const [auditCount, setAuditCount] = useState(0);
  const [reportedCount, setReportedCount] = useState(0);
  const [mfaChecking, setMfaChecking] = useState(true);
  const [mfaAllowed, setMfaAllowed] = useState(false);

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
    let cancelled = false;

    async function checkAdminMfa() {
      if (authLoading) return;

      if (!currentUser || currentUser.role !== "admin") {
        setMfaChecking(false);
        setMfaAllowed(false);
        return;
      }

      setMfaChecking(true);
      const state = await getAdminMfaState();
      if (cancelled) return;

      if (state.currentLevel === "aal2") {
        setMfaAllowed(true);
        setMfaChecking(false);
        return;
      }

      const target = state.verifiedTotpFactors.length > 0 ? "/admin/mfa" : "/admin/security";
      router.replace(`${target}?next=/admin`);
    }

    checkAdminMfa();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    setSearchQuery("");
  }, [tab]);

  useEffect(() => {
    let cancelled = false;

    async function loadBoardRequestCount() {
      if (authLoading || currentUser?.role !== "admin" || !mfaAllowed) return;

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
  }, [authLoading, currentUser?.role, mfaAllowed]);

  if (authLoading || mfaChecking) {
    return (
      <PageLoadingState
        title="Securing admin dashboard"
        subtitle="Checking your login and MFA verification."
        mode="admin"
      />
    );
  }

  if (!currentUser || currentUser.role !== "admin" || !mfaAllowed) return null;

  const memberCount = users.filter((u) => u.role !== "admin").length;
  const blockedCount = blockedUsers?.length || 0;

  const showUserSearch = tab === "pending" || tab === "members" || tab === "blocked";

  const tabs = [
    { k: "pending", label: "Pending", icon: UserCheck, count: pendingUsers.length },
    { k: "members", label: "Members", icon: Users, count: memberCount },
    { k: "blocked", label: "Blocked", icon: UserX, count: blockedCount },
    { k: "reported", label: "Reported", icon: Flag, count: reportedCount },
    { k: "board", label: "Board Prep", icon: BookOpen, count: boardRequestCount },
    { k: "gates", label: "Gates", icon: DoorOpen, count: gateCount },
    { k: "resources", label: "Resources", icon: Link2, count: resourceCount },
    { k: "audit", label: "Audit", icon: Activity, count: auditCount },
  ];

  const activeTab = tabs.find((item) => item.k === tab) || tabs[0];

  return (
    <AppShell hideNav>
      <main className="min-h-screen pb-16 md:pb-12" style={{ backgroundColor: T.bg }}>
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10 lg:px-10">
          <CircularBackButton href="/" label="Back to feed" />

          <div className="mt-6 mb-6 rounded-[2rem] border p-5 shadow-sm md:p-6" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} style={{ color: T.gold }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: T.gold }}>
                Administration
              </span>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl leading-tight font-serif" style={{ color: T.navy }}>
                  Admin dashboard
                </h1>
                <p className="mt-1 text-sm leading-6" style={{ color: T.textMuted }}>
                  Review users, reports, gates, resources, Board Prep content, and audit history from one safe admin panel.
                </p>
              </div>
              <span className="w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em]" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
                {activeTab.label}
              </span>
            </div>
          </div>

          <div className="mb-5">
            <AdminVerifyByEmail />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-6">
            <aside className="order-1 lg:order-2">
              <div className="rounded-[2rem] border p-3 shadow-sm lg:sticky lg:top-6" style={{ backgroundColor: T.card, borderColor: T.border }}>
                <div className="mb-3 rounded-2xl px-3 py-2" style={{ backgroundColor: T.surface }}>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: T.textSubtle }}>
                    Sidebar
                  </p>
                  <p className="mt-1 text-sm font-black" style={{ color: T.navy }}>
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
                        className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl px-3 text-left text-sm font-bold transition-all active:scale-[0.99]"
                        style={{
                          backgroundColor: active ? T.navy : "transparent",
                          color: active ? "#fff" : T.textMuted,
                          boxShadow: active ? "0 10px 24px rgba(11,28,44,0.14)" : "none",
                        }}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon size={17} />
                          <span className="truncate">{t.label}</span>
                        </span>
                        {Number(t.count) > 0 && (
                          <span
                            className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-black tabular-nums"
                            style={{
                              backgroundColor: active ? "rgba(255,255,255,0.17)" : T.borderSoft,
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

            <section className="order-2 min-w-0 lg:order-1">
              {showUserSearch && (
                <div className="mb-4 rounded-[1.5rem] border p-3 shadow-sm" style={{ backgroundColor: T.card, borderColor: T.border }}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textSubtle }}>
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
                      className="w-full h-11 rounded-2xl border text-sm outline-none pl-10 pr-3"
                      style={{ backgroundColor: T.surface, borderColor: T.border, color: T.text }}
                    />
                  </div>
                </div>
              )}

              <div className="rounded-[2rem] border p-4 shadow-sm md:p-6" style={{ backgroundColor: T.card, borderColor: T.border }}>
                {tab === "pending" && <PendingUsersList searchQuery={searchQuery} />}
                {tab === "members" && <MembersList searchQuery={searchQuery} />}
                {tab === "blocked" && <BlockedUsersList searchQuery={searchQuery} />}
                {tab === "reported" && <ReportedPostsList onCountChange={setReportedCount} />}
                {tab === "board" && <BoardPrepManager onPendingRequestCountChange={setBoardRequestCount} />}
                {tab === "gates" && <GateManager onCountChange={setGateCount} />}
                {tab === "resources" && <ResourceManager onCountChange={setResourceCount} />}
                {tab === "audit" && <AuditLogs onCountChange={setAuditCount} />}
              </div>
            </section>
          </div>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
