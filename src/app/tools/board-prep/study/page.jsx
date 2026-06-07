"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, Eye, EyeOff, RotateCcw } from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import ToolPage from "@/components/ui/ToolPage";

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-[1.65rem] border shadow-sm ${className}`}
      style={{ backgroundColor: T.card, borderColor: T.border, ...style }}
    >
      {children}
    </div>
  );
}

function getAnswerText(question) {
  return question.correct_answer || question[`option_${question.correct_option}`] || "Answer not available.";
}

function FlashCard({ question, index, showAll }) {
  const [open, setOpen] = useState(false);
  const visible = showAll || open;
  const answer = getAnswerText(question);

  useEffect(() => {
    if (!showAll) setOpen(false);
  }, [showAll]);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full p-4 text-left active:scale-[0.995]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.14em]" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
                QUESTION {String(index + 1).padStart(2, "0")}
              </span>
              {question.category && (
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: T.surface, color: T.textMuted }}>
                  {question.category}
                </span>
              )}
            </div>

            {question.source_publication && (
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: T.textSubtle }}>
                {question.source_publication}
              </p>
            )}

            <h2 className="text-lg font-black leading-snug" style={{ color: T.navy }}>
              {question.question}
            </h2>
          </div>

          <ChevronDown
            size={19}
            className={visible ? "shrink-0 rotate-180 transition" : "shrink-0 transition"}
            style={{ color: T.textSubtle }}
          />
        </div>
      </button>

      <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: T.borderSoft }}>
        <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.textMuted }}>
          Correct answer
        </p>

        {visible ? (
          <div className="mt-2 rounded-2xl border p-3" style={{ borderColor: "rgba(49,151,84,0.24)", backgroundColor: "#F3FBF6" }}>
            <p className="text-base font-black leading-6" style={{ color: T.success }}>
              {answer}
            </p>
            {question.explanation && (
              <p className="mt-2 text-sm leading-6" style={{ color: T.textMuted }}>
                {question.explanation}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-2 rounded-2xl border border-dashed p-3 text-center" style={{ borderColor: T.border, backgroundColor: T.surface }}>
            <p className="text-sm font-bold" style={{ color: T.textMuted }}>
              **** tap or click to see the answer ****
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function BoardPrepStudyPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const groupedCategories = useMemo(() => {
    return [...new Set(questions.map((q) => q.category).filter(Boolean))].slice(0, 5);
  }, [questions]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Sign in to study Board Prep questions.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/board-prep/questions", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));

    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Could not load study questions.");
      return;
    }

    setQuestions(json.data || []);
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  return (
    <AppShell hideNav>
      <ToolPage title="Study all questions" eyebrow="Board Prep" icon={BookOpen}>
        <div className="space-y-4">
          <Card className="p-4" style={{ background: `linear-gradient(135deg, ${T.navy}, #163b63)`, borderColor: "rgba(255,255,255,0.10)" }}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">Flash cards</p>
            <h1 className="mt-1 font-serif text-3xl font-black leading-tight text-white">Study in flash cards</h1>
            <p className="mt-2 text-sm leading-6 text-white/75">
              No multiple choice here. Tap each question to reveal the correct answer.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white/85">{questions.length || 0} questions</span>
              {groupedCategories.map((category) => (
                <span key={category} className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white/85">{category}</span>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border font-black"
              style={{ borderColor: showAll ? "rgba(49,151,84,0.28)" : T.border, backgroundColor: showAll ? "#F3FBF6" : T.card, color: showAll ? T.success : T.navy }}
            >
              {showAll ? <EyeOff size={17} /> : <Eye size={17} />}
              {showAll ? "Hide answers" : "See all answers"}
            </button>

            <button
              type="button"
              onClick={loadQuestions}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border font-black"
              style={{ borderColor: T.border, backgroundColor: T.card, color: T.navy }}
            >
              <RotateCcw size={16} />
              Refresh
            </button>
          </div>

          {loading && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>Loading flash cards...</Card>}

          {!loading && error && (
            <Card className="p-5 text-center">
              <p className="font-bold" style={{ color: T.danger }}>{error}</p>
              <button onClick={() => router.push("/tools/board-prep")} className="mt-4 rounded-2xl px-5 py-2 font-bold text-white" style={{ backgroundColor: T.navy }}>
                Back to Board Prep
              </button>
            </Card>
          )}

          {!loading && !error && questions.length === 0 && (
            <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>
              No questions available yet.
            </Card>
          )}

          {!loading && !error && questions.map((question, index) => (
            <FlashCard key={question.id} question={question} index={index} showAll={showAll} />
          ))}
        </div>
      </ToolPage>
    </AppShell>
  );
}
