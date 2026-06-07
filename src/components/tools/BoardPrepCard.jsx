"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, ChevronRight, Flame, Target } from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";

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

/**
 * Sidebar/mobile card promoting the daily Board Prep quiz.
 * The status query is read-only and does not create a daily session.
 */
export default function BoardPrepCard({ variant = "sidebar", className = "" }) {
  const router = useRouter();
  const status = useBoardPrepStatus();
  const compact = variant === "mobile";

  const badge = useMemo(() => {
    if (status.completed) {
      return {
        icon: CheckCircle2,
        title: "Daily quiz complete",
        detail: status.score === null ? "Streak saved" : `${status.score}/5 score · streak saved`,
        bg: "linear-gradient(135deg, #EAF8EF 0%, #F7FFFA 100%)",
        border: "rgba(49, 151, 84, 0.30)",
        color: T.success,
        iconBg: "rgba(49, 151, 84, 0.12)",
      };
    }

    if (status.signedIn && status.streak > 0) {
      return {
        icon: Flame,
        title: `${status.streak}-day streak active`,
        detail: "Finish today’s 5 questions",
        bg: "linear-gradient(135deg, #FFF7E8 0%, #FFFFFF 100%)",
        border: "rgba(204, 129, 24, 0.30)",
        color: T.amber,
        iconBg: "rgba(204, 129, 24, 0.13)",
      };
    }

    return {
      icon: Target,
      title: "Today’s board reps",
      detail: "5 questions · about 5 minutes",
      bg: "linear-gradient(135deg, #FDECF2 0%, #FFFFFF 100%)",
      border: "rgba(179, 25, 66, 0.24)",
      color: T.brandRed,
      iconBg: "rgba(179, 25, 66, 0.10)",
    };
  }, [status.completed, status.score, status.signedIn, status.streak]);

  const BadgeIcon = badge.icon;

  return (
    <button
      type="button"
      onClick={() => router.push("/tools/board-prep")}
      className={`w-full rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${compact ? "p-3" : "p-4"} ${className}`}
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`${compact ? "h-10 w-10" : "h-11 w-11"} flex shrink-0 items-center justify-center rounded-full`}
          style={{ backgroundColor: T.redBg }}
        >
          <BookOpen size={compact ? 18 : 20} style={{ color: T.brandRed }} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`${compact ? "text-base" : "text-lg"} font-semibold leading-none`} style={{ color: T.navy }}>
              Board Prep
            </h3>
            <ChevronRight size={18} style={{ color: T.textSubtle }} />
          </div>

          <p className={`${compact ? "mt-1 text-[12px]" : "mt-1.5 text-xs"} leading-relaxed`} style={{ color: T.textMuted }}>
            5 promotion board questions a day. Build your streak.
          </p>
        </div>
      </div>

      <div
        className={`${compact ? "mt-2.5 px-3 py-2" : "mt-3 px-3 py-2.5"} flex items-center justify-between gap-3 rounded-2xl border`}
        style={{ background: badge.bg, borderColor: badge.border }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: badge.iconBg, color: badge.color }}
          >
            <BadgeIcon size={18} strokeWidth={2.4} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black" style={{ color: badge.color }}>
              {status.loading ? "Checking daily streak..." : badge.title}
            </span>
            <span className="block truncate text-[11px] font-semibold" style={{ color: T.textMuted }}>
              {status.loading ? "One moment" : badge.detail}
            </span>
          </span>
        </div>

        {status.completed ? (
          <span className="rounded-full px-2 py-1 text-[11px] font-black" style={{ backgroundColor: "rgba(49, 151, 84, 0.12)", color: T.success }}>
            DONE
          </span>
        ) : null}
      </div>
    </button>
  );
}
