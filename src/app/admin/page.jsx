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

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{ backgroundColor: T.bg }}
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
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

          <div
            className="flex p-1 rounded-xl mb-5 overflow-x-auto no-scrollbar"
            style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.k;
              return (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className="flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all whitespace-nowrap px-3"
                  style={{
                    backgroundColor: active ? T.card : "transparent",
                    color: active ? T.navy : T.textMuted,
                    boxShadow: active ? "0 1px 2px rgba(11,28,44,0.06)" : "none",
                  }}
                >
                  <Icon size={14} />
                  {t.label}
                  {t.count !== "" && Number(t.count) > 0 && (
                    <span
                      className="text-[11px] px-1.5 rounded-full tabular-nums"
                      style={{
                        backgroundColor: active ? T.goldBg : T.borderSoft,
                        color: active ? T.gold : T.textSubtle,
                      }}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

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

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
