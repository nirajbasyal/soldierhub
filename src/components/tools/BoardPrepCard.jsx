"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, ChevronRight, Flame, Target } from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import MobileFeedQuickActions from "@/components/feed/MobileFeedQuickActions";

const HISTORY_DAYS = 14;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function computeStreak(history) {
  const completed = (history || [])
    .filter((h) => h.completed)
    .map((h) => h.session_date)
    .sort()
    .reverse();

  if (!completed.length) return 0;

  const today = getTodayKey();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  if (completed[0] !== today && completed[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < completed.length; i += 1) {
    const previous = new Date(completed[i - 1]);
    const current = new Date(completed[i]);
    if ((previous - current) / 86_400_000 === 1) streak += 1;
    else break;
  }

  return streak;
}

function useBoardPrepStatus() {
  const [status, setStatus] = useState({ loading: true, signedIn: false, completed: false, score: null, streak: 0 });

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const supabase = createClient();
        if (!supabase) {
          if (!cancelled) setStatus({ loading: false, signedIn: false, completed: false, score: null, streak: 0 });
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setStatus({ loading: false, signedIn: false, completed: false, score: null, streak: 0 });
          return;
        }

        const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
        const today = getTodayKey();

        const { data, error } = await supabase
          .from("board_sessions")
          .select("session_date, completed, score")
          .eq("user_id", user.id)
          .gte("session_date", since)
          .order("session_date", { ascending: false });

        if (error) throw error;

        const todaySession = (data || []).find((session) => session.session_date === today);

        if (!cancelled) {
          setStatus({
            loading: false,
            signedIn: true,
            completed: Boolean(todaySession?.completed),
            score: todaySession?.score ?? null,
            streak: computeStreak(data || []),
          });
        }
      } catch {
        if (!cancelled) setStatus({ loading: false, signedIn: false, completed: false, score: null, streak: 0 });
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

function getBadge(status) {
  if (status.loading) {
    return {
      icon: Target,
      title: "Daily Streak",
      detail: "Checking status",
      edge: "#8EA1B6",
      bg: "linear-gradient(135deg, #F7FAFD 0%, #FFFFFF 100%)",
      pillBg: "rgba(142, 161, 182, 0.14)",
      label: "...",
    };
  }

  if (status.completed) {
    return {
      icon: CheckCircle2,
      title: "Daily Streak complete",
      detail: status.score === null ? `${status.streak || 1}-day streak saved` : `${status.score}/5 score · ${status.streak || 1}-day streak`,
      edge: T.success,
      bg: "linear-gradient(135deg, #EAF8EF 0%, #FFFFFF 100%)",
      pillBg: "rgba(49, 151, 84, 0.13)",
      label: "DONE",
    };
  }

  if (status.signedIn && status.streak > 0) {
    return {
      icon: Flame,
      title: "Daily Streak",
      detail: `${status.streak}-day streak active · finish today`,
      edge: T.amber,
      bg: "linear-gradient(135deg, #FFF8EA 0%, #FFFFFF 100%)",
      pillBg: "rgba(204, 129, 24, 0.14)",
      label: "TODAY",
    };
  }

  return {
    icon: Target,
    title: "Daily Streak",
    detail: "5 questions · ~5 minutes",
    edge: T.brandRed,
    bg: "linear-gradient(135deg, #FDECF2 0%, #FFFFFF 100%)",
    pillBg: "rgba(179, 25, 66, 0.11)",
    label: "START",
  };
}

export function BoardPrepStatusBadge({ variant = "default", className = "", onClick }) {
  const status = useBoardPrepStatus();
  const badge = useMemo(() => getBadge(status), [status]);
  const Icon = badge.icon;
  const isMenu = variant === "menu";

  const content = isMenu ? (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: badge.pillBg, color: badge.edge }}
      >
        <Icon size={13} strokeWidth={2.6} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-black" style={{ color: badge.edge }}>
        {status.completed ? `${status.score ?? 0}/5 done` : badge.title}
      </span>
      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: badge.edge }}>
        {badge.label}
      </span>
    </div>
  ) : (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: badge.pillBg, color: badge.edge }}
      >
        <Icon size={18} strokeWidth={2.5} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black" style={{ color: T.navy }}>
          {badge.title}
        </span>
        <span className="block truncate text-[11px] font-semibold" style={{ color: T.textMuted }}>
          {badge.detail}
        </span>
      </span>

      <span
        className="shrink-0 rounded-full px-2 py-1 text-[10px] font-black tracking-[0.12em]"
        style={{ backgroundColor: badge.pillBg, color: badge.edge }}
      >
        {badge.label}
      </span>
    </div>
  );

  const sharedClass = `${isMenu ? "min-h-[30px] rounded-xl px-2.5 py-1.5 shadow-none" : "rounded-[1.35rem] px-3.5 py-3 shadow-sm"} flex w-full items-center border text-left transition active:scale-[0.99] ${className}`;
  const sharedStyle = { background: badge.bg, borderColor: `${badge.edge}36` };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={sharedClass} style={sharedStyle}>
        {content}
      </button>
    );
  }

  return <div className={sharedClass} style={sharedStyle}>{content}</div>;
}

/**
 * Sidebar card promoting Board Prep.
 * Public visitors go straight to Study all questions and do not see Daily Streak.
 * Signed-in users keep the Daily Quiz / streak entry point.
 * The mobile feed variant renders a compact quick-action row below the feed hero.
 */
export default function BoardPrepCard({ variant = "sidebar", className = "" }) {
  const router = useRouter();
  const compact = variant === "mobile";
  const status = useBoardPrepStatus();
  const showStreakBadge = status.signedIn;
  const targetUrl = status.signedIn || status.loading ? "/tools/board-prep" : "/tools/board-prep/study";

  if (compact) return <MobileFeedQuickActions />;

  return (
    <button
      type="button"
      onClick={() => router.push(targetUrl)}
      className={`w-full rounded-3xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${className}`}
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: T.redBg }}
        >
          <BookOpen size={20} style={{ color: T.brandRed }} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold leading-none" style={{ color: T.navy }}>
              Board Prep
            </h3>
            <ChevronRight size={18} style={{ color: T.textSubtle }} />
          </div>

          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: T.textMuted }}>
            {showStreakBadge ? "Daily board quiz, streaks, and study cards." : "Study board questions and cards."}
          </p>
        </div>
      </div>

      {showStreakBadge && (
        <div className="mt-3">
          <BoardPrepStatusBadge />
        </div>
      )}
    </button>
  );
}
