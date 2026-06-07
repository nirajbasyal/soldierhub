"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Filter,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
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

function getScoreSummary(scores, total) {
  const values = Object.values(scores || {});
  const known = values.filter((value) => value === "known").length;
  const review = values.filter((value) => value === "review").length;
  const attempted = known + review;
  const percent = attempted ? Math.round((known / attempted) * 100) : 0;
  return { known, review, attempted, total, percent };
}

function ScoreHero({ summary, filteredCount, totalCount }) {
  const progress = summary.total ? Math.round((summary.attempted / summary.total) * 100) : 0;

  return (
    <Card
      className="overflow-hidden p-4"
      style={{
        background: "linear-gradient(135deg, #FFFFFF 0%, #F7FBFF 48%, #EEF6FF 100%)",
        borderColor: "#D9E5F2",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: T.brandRed }}>
            Study score
          </p>
          <h2 className="mt-1 text-2xl font-black leading-tight" style={{ color: T.navy }}>
            {summary.known}/{summary.attempted || 0} known
          </h2>
          <p className="mt-1 text-xs font-semibold" style={{ color: T.textMuted }}>
            {summary.review} need review · {summary.total - summary.attempted} not scored
          </p>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: T.textSubtle }}>
            Showing {filteredCount} of {totalCount} questions
          </p>
        </div>

        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4"
          style={{
            borderColor: summary.percent >= 80 ? T.success : summary.percent >= 50 ? T.amber : "#D9E5F2",
            backgroundColor: summary.percent >= 80 ? "#F3FBF6" : summary.percent >= 50 ? T.goldBg : "#FFFFFF",
            color: summary.percent >= 80 ? T.success : summary.percent >= 50 ? T.amber : T.textMuted,
          }}
        >
          <span className="text-lg font-black">{summary.percent}%</span>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: T.borderSoft }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: T.brandRed }}
        />
      </div>
    </Card>
  );
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border px-3 py-2 text-xs font-black transition active:scale-[0.98]"
      style={{
        borderColor: active ? T.brandRed : T.border,
        backgroundColor: active ? T.redBg : T.card,
        color: active ? T.brandRed : T.textMuted,
      }}
    >
      {children}
    </button>
  );
}

function StudyControls({
  searchQuery,
  setSearchQuery,
  filterOpen,
  setFilterOpen,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  categories,
  showAll,
  setShowAll,
  resetScores,
}) {
  return (
    <Card className="p-3">
      <div className="flex gap-2">
        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
          <Search size={17} style={{ color: T.textSubtle }} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search questions"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-semibold"
            style={{ color: T.text }}
          />
        </div>

        <button
          type="button"
          onClick={() => setFilterOpen((value) => !value)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
          style={{ borderColor: filterOpen ? T.brandRed : T.border, backgroundColor: filterOpen ? T.redBg : T.card, color: filterOpen ? T.brandRed : T.navy }}
          aria-label="Filter questions"
        >
          <Filter size={18} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="flex h-10 items-center justify-center gap-2 rounded-2xl border text-xs font-black"
          style={{ borderColor: showAll ? "rgba(49,151,84,0.28)" : T.border, backgroundColor: showAll ? "#F3FBF6" : T.card, color: showAll ? T.success : T.navy }}
        >
          {showAll ? <EyeOff size={15} /> : <Eye size={15} />}
          {showAll ? "Hide answers" : "See all answers"}
        </button>

        <button
          type="button"
          onClick={resetScores}
          className="flex h-10 items-center justify-center gap-2 rounded-2xl border text-xs font-black"
          style={{ borderColor: T.border, backgroundColor: T.card, color: T.navy }}
        >
          <RotateCcw size={15} /> Reset score
        </button>
      </div>

      {filterOpen && (
        <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: T.borderSoft }}>
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.textSubtle }}>
              Score filter
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                ["all", "All"],
                ["known", "I knew it"],
                ["review", "Need review"],
                ["unscored", "Not scored"],
              ].map(([value, label]) => (
                <FilterChip key={value} active={statusFilter === value} onClick={() => setStatusFilter(value)}>
                  {label}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.textSubtle }}>
              Category
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <FilterChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>All</FilterChip>
              {categories.map((category) => (
                <FilterChip key={category} active={categoryFilter === category} onClick={() => setCategoryFilter(category)}>
                  {category}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function FlashCard({ question, index, showAll, score, onScore }) {
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
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.14em]"
                style={{ backgroundColor: T.blueSoft, color: T.blue }}
              >
                QUESTION {String(index + 1).padStart(2, "0")}
              </span>

              {question.category && (
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ backgroundColor: T.surface, color: T.textMuted }}
                >
                  {question.category}
                </span>
              )}

              {score === "known" && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black"
                  style={{ backgroundColor: "#F3FBF6", color: T.success }}
                >
                  <CheckCircle2 size={12} /> Knew it
                </span>
              )}

              {score === "review" && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black"
                  style={{ backgroundColor: T.dangerBg, color: T.danger }}
                >
                  <XCircle size={12} /> Review
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
          <button
            type="button"
            onClick={() => {
              if (!showAll) setOpen(false);
            }}
            className="mt-2 w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]"
            style={{ borderColor: "rgba(49,151,84,0.24)", backgroundColor: "#F3FBF6" }}
          >
            <p className="text-base font-black leading-6" style={{ color: T.success }}>
              {answer}
            </p>
            {question.explanation && (
              <p className="mt-2 text-sm leading-6" style={{ color: T.textMuted }}>
                {question.explanation}
              </p>
            )}
            {!showAll && (
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>
                Tap again to hide answer
              </p>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 w-full rounded-2xl border border-dashed p-3 text-center transition active:scale-[0.99]"
            style={{ borderColor: T.border, backgroundColor: T.surface }}
          >
            <p className="text-sm font-bold" style={{ color: T.textMuted }}>
              **** tap or click to see the answer ****
            </p>
          </button>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onScore(question.id, "known")}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-black"
            style={{
              borderColor: score === "known" ? "rgba(49,151,84,0.38)" : T.border,
              backgroundColor: score === "known" ? "#F3FBF6" : T.card,
              color: score === "known" ? T.success : T.navy,
            }}
          >
            <CheckCircle2 size={16} /> I knew it
          </button>

          <button
            type="button"
            onClick={() => onScore(question.id, "review")}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-black"
            style={{
              borderColor: score === "review" ? "rgba(185,28,28,0.30)" : T.border,
              backgroundColor: score === "review" ? T.dangerBg : T.card,
              color: score === "review" ? T.danger : T.navy,
            }}
          >
            <XCircle size={16} /> Need review
          </button>
        </div>
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
  const [scores, setScores] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(() => {
    return [...new Set(questions.map((q) => q.category).filter(Boolean))].sort();
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return questions.filter((question) => {
      const score = scores[question.id];
      if (statusFilter === "known" && score !== "known") return false;
      if (statusFilter === "review" && score !== "review") return false;
      if (statusFilter === "unscored" && score) return false;
      if (categoryFilter !== "all" && question.category !== categoryFilter) return false;

      if (!search) return true;
      const haystack = [
        question.question,
        question.category,
        question.source_publication,
        question.explanation,
        getAnswerText(question),
      ].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(search);
    });
  }, [questions, scores, searchQuery, statusFilter, categoryFilter]);

  const summary = useMemo(() => getScoreSummary(scores, questions.length), [scores, questions.length]);

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
    setScores({});
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  function handleScore(questionId, value) {
    setScores((current) => ({ ...current, [questionId]: value }));
  }

  return (
    <AppShell hideNav>
      <ToolPage title="Study all questions" eyebrow="Board Prep" icon={BookOpen}>
        <div className="space-y-4">
          <div className="sticky top-0 z-20 -mx-1 space-y-3 rounded-b-[1.75rem] px-1 pb-3 pt-1" style={{ backgroundColor: T.bg }}>
            <ScoreHero summary={summary} filteredCount={filteredQuestions.length} totalCount={questions.length} />
            <StudyControls
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterOpen={filterOpen}
              setFilterOpen={setFilterOpen}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              categories={categories}
              showAll={showAll}
              setShowAll={setShowAll}
              resetScores={() => setScores({})}
            />
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

          {!loading && !error && questions.length > 0 && filteredQuestions.length === 0 && (
            <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>
              No questions match your search or filters.
            </Card>
          )}

          <div className="space-y-4 pb-8">
            {!loading && !error && filteredQuestions.map((question, index) => (
              <FlashCard
                key={question.id}
                question={question}
                index={index}
                showAll={showAll}
                score={scores[question.id]}
                onScore={handleScore}
              />
            ))}
          </div>
        </div>
      </ToolPage>
    </AppShell>
  );
}
