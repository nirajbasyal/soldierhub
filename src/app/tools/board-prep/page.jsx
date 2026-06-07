"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  ChevronRight,
  Flame,
  Trophy,
  RotateCcw,
  Home,
} from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import ToolPage from "@/components/ui/ToolPage";

// ─── Constants ───────────────────────────────────────────────────────────────

const OPTION_KEYS = ["a", "b", "c", "d"];
const OPTION_LABELS = { a: "A", b: "B", c: "C", d: "D" };
const TOTAL = 5;

const SCORE_MESSAGE = {
  5: "Perfect score! You're board-ready.",
  4: "Strong performance. Keep it up.",
  3: "Solid effort. Review what you missed.",
  2: "Keep studying — you'll get there.",
  1: "Every expert was once a beginner.",
  0: "Use the explanations to guide your study.",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function optionBg(key, selected, result) {
  if (!result) {
    return key === selected
      ? { backgroundColor: T.blueSoft, borderColor: T.blue }
      : { backgroundColor: T.card, borderColor: T.border };
  }
  if (key === result.correct_option) {
    return { backgroundColor: T.successBg, borderColor: T.success };
  }
  if (key === selected && !result.correct) {
    return { backgroundColor: T.dangerBg, borderColor: T.danger };
  }
  return { backgroundColor: T.card, borderColor: T.border };
}

function optionTextColor(key, selected, result) {
  if (!result) return key === selected ? T.blue : T.text;
  if (key === result.correct_option) return T.success;
  if (key === selected && !result.correct) return T.danger;
  return T.textMuted;
}

function getOptionText(q, key) {
  return q[`option_${key}`] || "";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div
      className="rounded-2xl border p-6"
      style={{ backgroundColor: T.card, borderColor: T.border, ...style }}
    >
      {children}
    </div>
  );
}

function ProgressBar({ answered }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: T.textMuted }}>
          Question {answered + 1} of {TOTAL}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all"
              style={{
                width: 28,
                backgroundColor: i < answered ? T.success : i === answered ? T.blue : T.border,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StreakBadge({ streak }) {
  if (!streak) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
      style={{ backgroundColor: "#FFF1D7", color: T.amber }}
    >
      <Flame size={14} />
      {streak}-day streak
    </span>
  );
}

function CategoryBadge({ category }) {
  return (
    <span
      className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border"
      style={{ backgroundColor: T.blueSoft, color: T.blue, borderColor: "#BCD0EA" }}
    >
      {category}
    </span>
  );
}

// ─── Phase: Intro ─────────────────────────────────────────────────────────────

function IntroPhase({ streak, questions, onStart }) {
  const categories = [...new Set(questions.map((q) => q.category))];

  return (
    <Card>
      <div className="flex flex-col items-center text-center gap-4 py-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: T.redBg }}
        >
          <BookOpen size={30} style={{ color: T.brandRed }} />
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold mb-1" style={{ color: T.navy }}>
            Daily Board Prep
          </h2>
          <p className="text-sm" style={{ color: T.textMuted }}>
            {TOTAL} questions · ~5 minutes · builds your streak
          </p>
        </div>

        {streak > 0 && <StreakBadge streak={streak} />}

        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <CategoryBadge key={c} category={c} />
            ))}
          </div>
        )}

        <button
          onClick={onStart}
          className="mt-2 w-full h-12 rounded-xl font-semibold text-white transition-all"
          style={{ backgroundColor: T.brandRed }}
        >
          Start Today&apos;s Questions
        </button>
      </div>
    </Card>
  );
}

// ─── Phase: Question ──────────────────────────────────────────────────────────

function QuestionPhase({ question, questionIndex, selected, result, submitting, onSelect, onSubmit, onNext }) {
  const answered = result !== null;

  return (
    <Card>
      <ProgressBar answered={questionIndex} />

      <div className="mb-2">
        <CategoryBadge category={question.category} />
      </div>

      <p className="text-lg font-semibold leading-snug mb-5" style={{ color: T.text }}>
        {question.question}
      </p>

      <div className="flex flex-col gap-2.5 mb-5">
        {OPTION_KEYS.map((key) => {
          const bg = optionBg(key, selected, result);
          const textColor = optionTextColor(key, selected, result);
          const isCorrect = result && key === result.correct_option;
          const isWrong = result && key === selected && !result.correct;

          return (
            <button
              key={key}
              onClick={() => !answered && onSelect(key)}
              disabled={answered}
              className="flex items-start gap-3 w-full rounded-xl border px-4 py-3 text-left transition-all"
              style={{ ...bg, cursor: answered ? "default" : "pointer" }}
            >
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 border"
                style={{
                  backgroundColor: answered
                    ? isCorrect
                      ? T.successBg
                      : isWrong
                      ? T.dangerBg
                      : T.surface
                    : key === selected
                    ? T.blue
                    : T.surface,
                  borderColor: answered
                    ? isCorrect
                      ? T.success
                      : isWrong
                      ? T.danger
                      : T.border
                    : key === selected
                    ? T.blue
                    : T.border,
                  color: answered
                    ? isCorrect
                      ? T.success
                      : isWrong
                      ? T.danger
                      : T.textMuted
                    : key === selected
                    ? "#fff"
                    : T.textMuted,
                }}
              >
                {OPTION_LABELS[key]}
              </span>
              <span className="text-sm leading-relaxed" style={{ color: textColor }}>
                {getOptionText(question, key)}
              </span>
              {answered && isCorrect && (
                <CheckCircle size={16} className="flex-shrink-0 ml-auto mt-0.5" style={{ color: T.success }} />
              )}
              {answered && isWrong && (
                <XCircle size={16} className="flex-shrink-0 ml-auto mt-0.5" style={{ color: T.danger }} />
              )}
            </button>
          );
        })}
      </div>

      {answered && result && (
        <div
          className="rounded-xl border p-4 mb-5"
          style={{
            backgroundColor: result.correct ? T.successBg : T.dangerBg,
            borderColor: result.correct ? T.success : T.danger,
          }}
        >
          <div
            className="flex items-center gap-2 font-semibold mb-1"
            style={{ color: result.correct ? T.success : T.danger }}
          >
            {result.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {result.correct ? "Correct!" : "Not quite"}
          </div>
          {result.explanation && (
            <p className="text-sm leading-relaxed" style={{ color: T.text }}>
              {result.explanation}
            </p>
          )}
        </div>
      )}

      {!answered ? (
        <button
          onClick={onSubmit}
          disabled={!selected || submitting}
          className="w-full h-11 rounded-xl font-semibold text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: T.brandRed }}
        >
          {submitting ? "Checking…" : "Submit Answer"}
        </button>
      ) : (
        <button
          onClick={onNext}
          className="w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
          style={{ backgroundColor: T.navy, color: "#fff" }}
        >
          {questionIndex + 1 < TOTAL ? (
            <>
              Next Question <ChevronRight size={16} />
            </>
          ) : (
            <>
              See Results <Trophy size={16} />
            </>
          )}
        </button>
      )}
    </Card>
  );
}

// ─── Phase: Done ─────────────────────────────────────────────────────────────

function DonePhase({ score, streak, questions, session, onReturnHome }) {
  const msg = SCORE_MESSAGE[score] || SCORE_MESSAGE[0];
  const pct = Math.round((score / TOTAL) * 100);

  const categoryResults = questions.map((q) => ({
    category: q.category,
    correct: session.answers?.[q.id] === q.correct_option,
  }));

  return (
    <Card>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center border-4"
          style={{
            borderColor: score >= 4 ? T.success : score >= 2 ? T.amber : T.danger,
            backgroundColor: score >= 4 ? T.successBg : score >= 2 ? T.amberBg : T.dangerBg,
          }}
        >
          <span
            className="text-2xl font-bold font-serif"
            style={{ color: score >= 4 ? T.success : score >= 2 ? T.amber : T.danger }}
          >
            {score}/{TOTAL}
          </span>
        </div>

        <div>
          <h2 className="text-xl font-serif font-bold mb-1" style={{ color: T.navy }}>
            Session Complete
          </h2>
          <p className="text-sm" style={{ color: T.textMuted }}>
            {msg}
          </p>
        </div>

        {streak > 0 && <StreakBadge streak={streak} />}

        <div className="w-full rounded-xl border" style={{ borderColor: T.border }}>
          {categoryResults.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3 border-b last:border-b-0"
              style={{ borderColor: T.borderSoft }}
            >
              <span className="text-sm" style={{ color: T.textMuted }}>
                {questions[i]?.category}
              </span>
              {r.correct ? (
                <CheckCircle size={16} style={{ color: T.success }} />
              ) : (
                <XCircle size={16} style={{ color: T.danger }} />
              )}
            </div>
          ))}
        </div>

        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: score >= 4 ? T.success : score >= 2 ? T.amber : T.danger,
            }}
          />
        </div>

        <p className="text-xs" style={{ color: T.textSubtle }}>
          Come back tomorrow to keep your streak alive.
        </p>

        <button
          onClick={onReturnHome}
          className="w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2"
          style={{ backgroundColor: T.navy, color: "#fff" }}
        >
          <Home size={16} />
          Back to Feed
        </button>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BoardPrepPage() {
  const router = useRouter();

  const [phase, setPhase] = useState("loading"); // loading | auth | intro | question | done
  const [data, setData] = useState(null);         // { session, questions, streak, history }
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Derived helpers
  const session = data?.session;
  const questions = data?.questions || [];
  const streak = data?.streak || 0;
  const currentQuestion = questions[questionIdx] || null;

  const fetchDaily = useCallback(async () => {
    setPhase("loading");
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setPhase("auth");
      return;
    }

    const res = await fetch("/api/board-prep/daily", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Could not load Board Prep. Try again.");
      setPhase("error");
      return;
    }

    const json = await res.json();
    setData(json);

    const answeredCount = Object.keys(json.session?.answers || {}).length;

    if (json.session?.completed) {
      setPhase("done");
    } else if (answeredCount === 0) {
      setPhase("intro");
    } else {
      // Resume mid-session
      setQuestionIdx(answeredCount);
      setPhase("question");
    }
  }, []);

  useEffect(() => {
    fetchDaily();
  }, [fetchDaily]);

  const handleStart = () => {
    setQuestionIdx(0);
    setSelected(null);
    setResult(null);
    setPhase("question");
  };

  const handleSubmit = async () => {
    if (!selected || !currentQuestion || !session) return;
    setSubmitting(true);

    const token = await getAccessToken();
    const res = await fetch("/api/board-prep/answer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: session.id,
        question_id: currentQuestion.id,
        selected_option: selected,
      }),
    });

    const json = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error || "Could not submit answer.");
      return;
    }

    setResult({
      correct: json.correct,
      correct_option: json.correct_option,
      explanation: json.explanation,
    });

    // Sync updated session into local state
    setData((prev) => ({
      ...prev,
      session: json.session,
    }));
  };

  const handleNext = () => {
    const nextIdx = questionIdx + 1;
    if (nextIdx >= TOTAL) {
      // Re-fetch to get updated streak then show done
      fetchDaily().then(() => setPhase("done"));
      return;
    }
    setQuestionIdx(nextIdx);
    setSelected(null);
    setResult(null);
  };

  return (
    <AppShell hideNav>
      <ToolPage title="Board Prep" eyebrow="Soldier Tools" icon={BookOpen}>
        {phase === "loading" && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: T.brandRed, borderTopColor: "transparent" }}
              />
              <span className="text-sm" style={{ color: T.textMuted }}>
                Loading today&apos;s questions…
              </span>
            </div>
          </div>
        )}

        {phase === "auth" && (
          <Card>
            <div className="text-center py-6">
              <p className="font-semibold mb-1" style={{ color: T.navy }}>
                Sign in to use Board Prep
              </p>
              <p className="text-sm mb-5" style={{ color: T.textMuted }}>
                Track your daily streak and study progress.
              </p>
              <button
                onClick={() => router.push("/")}
                className="h-10 px-6 rounded-xl font-semibold text-white"
                style={{ backgroundColor: T.brandRed }}
              >
                Back to Feed
              </button>
            </div>
          </Card>
        )}

        {phase === "error" && (
          <Card>
            <div className="text-center py-6">
              <p className="font-semibold mb-1" style={{ color: T.danger }}>
                Something went wrong
              </p>
              <p className="text-sm mb-5" style={{ color: T.textMuted }}>
                {error}
              </p>
              <button
                onClick={fetchDaily}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-xl font-semibold text-white"
                style={{ backgroundColor: T.navy }}
              >
                <RotateCcw size={15} />
                Retry
              </button>
            </div>
          </Card>
        )}

        {phase === "intro" && (
          <IntroPhase streak={streak} questions={questions} onStart={handleStart} />
        )}

        {phase === "question" && currentQuestion && (
          <QuestionPhase
            question={currentQuestion}
            questionIndex={questionIdx}
            selected={selected}
            result={result}
            submitting={submitting}
            onSelect={setSelected}
            onSubmit={handleSubmit}
            onNext={handleNext}
          />
        )}

        {phase === "done" && session && (
          <DonePhase
            score={session.score ?? 0}
            streak={streak}
            questions={questions}
            session={session}
            onReturnHome={() => router.push("/")}
          />
        )}
      </ToolPage>
    </AppShell>
  );
}
