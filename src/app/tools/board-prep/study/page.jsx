"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  Layers,
  PlusCircle,
  RotateCcw,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import ToolPage from "@/components/ui/ToolPage";

const SCORE_DRAFT_KEY = "soldierhub:board-prep-study-scores:v1";
const FLASHCARD_MARKER = "__FLASHCARD__";
const ALL_DECK_KEY = "__all__";

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
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

function isFlashcardQuestion(question) {
  return (
    question?.question_type === "flashcard" ||
    (question?.option_b === FLASHCARD_MARKER &&
      question?.option_c === FLASHCARD_MARKER &&
      question?.option_d === FLASHCARD_MARKER)
  );
}

function getAnswerText(question) {
  return question.correct_answer || question[`option_${question.correct_option}`] || "Answer not available.";
}

function getCategoryLabel(question) {
  return question?.category?.trim() || "General";
}

function getQuestionScoreSummary(scores, questions = []) {
  const ids = new Set(questions.map((question) => question.id));
  const values = Object.entries(scores || {})
    .filter(([id]) => ids.has(id))
    .map(([, value]) => value);
  const known = values.filter((value) => value === "known").length;
  const review = values.filter((value) => value === "review").length;
  const attempted = known + review;
  const total = questions.length;
  const percent = attempted ? Math.round((known / attempted) * 100) : 0;
  return { known, review, attempted, total, percent };
}

function loadDraftScores(validIds = []) {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(SCORE_DRAFT_KEY) || "{}");
    const valid = new Set(validIds);
    return Object.fromEntries(
      Object.entries(parsed || {}).filter(
        ([id, value]) => valid.has(id) && ["known", "review"].includes(value)
      )
    );
  } catch {
    return {};
  }
}

function saveDraftScores(scores) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SCORE_DRAFT_KEY, JSON.stringify(scores || {}));
}

function ScoreHero({ summary, filteredCount, totalCount, title = "Study score", subtitle = "draft saved" }) {
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
            {title}
          </p>
          <h2 className="mt-1 text-2xl font-black leading-tight" style={{ color: T.navy }}>
            {summary.known}/{summary.attempted || 0} known
          </h2>
          <p className="mt-1 text-xs font-semibold" style={{ color: T.textMuted }}>
            {summary.review} need review · {summary.total - summary.attempted} not scored
          </p>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: T.textSubtle }}>
            Showing {filteredCount} of {totalCount} questions · {subtitle}
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
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: T.brandRed }} />
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

function getFilterLabel(statusFilter) {
  return { all: "All", known: "I knew it", review: "Need review", unscored: "Not scored" }[statusFilter] || "All";
}

function StudyControls({
  searchQuery,
  setSearchQuery,
  filterOpen,
  setFilterOpen,
  statusFilter,
  setStatusFilter,
  showAll,
  setShowAll,
  resetScores,
}) {
  const filters = [
    ["all", "All"],
    ["known", "I knew it"],
    ["review", "Need review"],
    ["unscored", "Not scored"],
  ];

  return (
    <Card className="p-2.5">
      <div className="flex gap-2">
        <div
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3"
          style={{ borderColor: T.border, backgroundColor: T.surface }}
        >
          <Search size={16} style={{ color: T.textSubtle }} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search this deck"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-semibold"
            style={{ color: T.text }}
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((value) => !value)}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border px-3"
          style={{
            borderColor: filterOpen ? T.brandRed : T.border,
            backgroundColor: filterOpen ? T.redBg : T.card,
            color: filterOpen ? T.brandRed : T.navy,
          }}
          aria-label="Filter questions"
        >
          <Filter size={17} />
          <span className="max-w-[78px] truncate text-xs font-black">{getFilterLabel(statusFilter)}</span>
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="flex h-9 items-center justify-center gap-2 rounded-2xl border text-xs font-black"
          style={{
            borderColor: showAll ? "rgba(49,151,84,0.28)" : T.border,
            backgroundColor: showAll ? "#F3FBF6" : T.card,
            color: showAll ? T.success : T.navy,
          }}
        >
          {showAll ? <EyeOff size={14} /> : <Eye size={14} />}
          {showAll ? "Hide answers" : "See answers"}
        </button>
        <button
          type="button"
          onClick={resetScores}
          className="flex h-9 items-center justify-center gap-2 rounded-2xl border text-xs font-black"
          style={{ borderColor: T.border, backgroundColor: T.card, color: T.navy }}
        >
          <RotateCcw size={14} /> Reset score
        </button>
      </div>

      {filterOpen && (
        <div className="mt-2 rounded-2xl border p-2" style={{ borderColor: T.borderSoft, backgroundColor: T.surface }}>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filters.map(([value, label]) => (
              <FilterChip
                key={value}
                active={statusFilter === value}
                onClick={() => {
                  setStatusFilter(value);
                  setFilterOpen(false);
                }}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function AddQuestionRequestPanel() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("single");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  async function submitRequest() {
    const isSingle = mode === "single";
    const singleQuestion = question.trim();
    const singleAnswer = answer.trim();
    const bulk = bulkText.trim();

    if (isSingle && (!singleQuestion || !singleAnswer)) {
      setStatus({ type: "error", text: "Add both question and answer." });
      return;
    }
    if (!isSingle && !bulk) {
      setStatus({ type: "error", text: "Paste the questions and answers first." });
      return;
    }

    setSending(true);
    setStatus(null);
    const token = await getAccessToken();
    const message = isSingle
      ? `User submitted one Board Prep flashcard.\n\nQuestion: ${singleQuestion}\n\nAnswer: ${singleAnswer}`
      : `User submitted multiple Board Prep questions for review.\n\n${bulk}`;

    const res = await fetch("/api/board-prep/request", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        request_type: "add",
        question_id: null,
        category: "User submitted",
        message,
        suggested_question: isSingle ? singleQuestion : bulk.slice(0, 500),
        suggested_answer: isSingle ? singleAnswer : bulk.slice(0, 900),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSending(false);

    if (!res.ok) {
      setStatus({ type: "error", text: json.error || "Could not submit question." });
      return;
    }

    setQuestion("");
    setAnswer("");
    setBulkText("");
    setStatus({ type: "success", text: "Submitted to admin for review." });
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
            <PlusCircle size={19} />
          </span>
          <div className="min-w-0">
            <p className="font-black leading-tight" style={{ color: T.navy }}>Help Soldier Hub add more questions</p>
            <p className="mt-0.5 text-xs leading-5" style={{ color: T.textMuted }}>Submit one question or multiple questions for admin review.</p>
          </div>
        </div>
        <ChevronDown size={18} className={open ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} style={{ color: T.textMuted }} />
      </button>

      {open && (
        <div className="border-t p-3" style={{ borderColor: T.borderSoft }}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("single")}
              className="h-10 rounded-2xl border text-sm font-black"
              style={{ borderColor: mode === "single" ? T.brandRed : T.border, backgroundColor: mode === "single" ? T.redBg : T.card, color: mode === "single" ? T.brandRed : T.textMuted }}
            >
              Add single question
            </button>
            <button
              type="button"
              onClick={() => setMode("multiple")}
              className="h-10 rounded-2xl border text-sm font-black"
              style={{ borderColor: mode === "multiple" ? T.brandRed : T.border, backgroundColor: mode === "multiple" ? T.redBg : T.card, color: mode === "multiple" ? T.brandRed : T.textMuted }}
            >
              Add multiple questions
            </button>
          </div>

          {mode === "single" ? (
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: T.textSubtle }}>Question input</span>
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} className="w-full rounded-2xl border p-3 text-sm font-semibold outline-none" style={{ borderColor: T.border, color: T.text }} placeholder="Type the board question." />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: T.textSubtle }}>Answer</span>
                <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} className="w-full rounded-2xl border p-3 text-sm font-semibold outline-none" style={{ borderColor: T.border, color: T.text }} placeholder="Type the correct answer." />
              </label>
            </div>
          ) : (
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: T.textSubtle }}>Multiple questions</span>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={7} className="w-full rounded-2xl border p-3 text-sm font-semibold outline-none" style={{ borderColor: T.border, color: T.text }} placeholder={"Enter multiple questions and answers here.\n\nExample:\nQ: What does AR 670-1 cover?\nA: Wear and appearance of Army uniforms and insignia."} />
            </label>
          )}

          <button
            type="button"
            onClick={submitRequest}
            disabled={sending}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl font-black text-white disabled:opacity-50"
            style={{ backgroundColor: T.brandRed }}
          >
            <Send size={15} /> {sending ? "Submitting..." : "Submit for review"}
          </button>
          {status && <p className="mt-2 text-xs font-semibold" style={{ color: status.type === "success" ? T.success : T.danger }}>{status.text}</p>}
        </div>
      )}
    </Card>
  );
}

function DeckCard({ deck, onSelect }) {
  const notScored = Math.max(deck.total - deck.summary.attempted, 0);
  const progress = deck.total ? Math.round((deck.summary.attempted / deck.total) * 100) : 0;
  const isAll = deck.key === ALL_DECK_KEY;

  return (
    <button
      type="button"
      onClick={() => onSelect(deck)}
      className="group rounded-[1.65rem] border p-4 text-left shadow-sm transition active:scale-[0.99]"
      style={{
        backgroundColor: T.card,
        borderColor: isAll ? "rgba(179,25,66,0.30)" : T.border,
        boxShadow: isAll ? "0 12px 26px rgba(179,25,66,0.08)" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: isAll ? T.redBg : T.blueSoft, color: isAll ? T.brandRed : T.blue }}>
            <Layers size={20} />
          </div>
          <h3 className="line-clamp-2 text-lg font-black leading-snug" style={{ color: T.navy }}>{deck.label}</h3>
          <p className="mt-1 text-xs font-semibold" style={{ color: T.textMuted }}>{deck.total} question{deck.total === 1 ? "" : "s"}</p>
        </div>
        <ChevronRight size={20} className="mt-1 shrink-0 transition group-hover:translate-x-0.5" style={{ color: T.textSubtle }} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl p-2 text-center" style={{ backgroundColor: "#F3FBF6" }}>
          <p className="text-base font-black" style={{ color: T.success }}>{deck.summary.known}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: T.textMuted }}>Known</p>
        </div>
        <div className="rounded-2xl p-2 text-center" style={{ backgroundColor: T.dangerBg }}>
          <p className="text-base font-black" style={{ color: T.danger }}>{deck.summary.review}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: T.textMuted }}>Review</p>
        </div>
        <div className="rounded-2xl p-2 text-center" style={{ backgroundColor: T.surface }}>
          <p className="text-base font-black" style={{ color: T.navy }}>{notScored}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: T.textMuted }}>New</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: T.borderSoft }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: isAll ? T.brandRed : T.blue }} />
      </div>
    </button>
  );
}

function DeckSelection({ decks, deckQuery, setDeckQuery, onSelect }) {
  const filteredDecks = useMemo(() => {
    const search = deckQuery.trim().toLowerCase();
    if (!search) return decks;
    return decks.filter((deck) => deck.label.toLowerCase().includes(search));
  }, [decks, deckQuery]);

  return (
    <div className="space-y-4">
      <Card className="p-4" style={{ background: `linear-gradient(135deg, ${T.navy}, #163b63)`, borderColor: "rgba(255,255,255,0.12)" }}>
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Layers size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/65">Study decks</p>
            <h2 className="mt-1 text-2xl font-serif font-black text-white">Choose a category</h2>
            <p className="mt-1 text-xs font-semibold text-white/70">Pick one deck so you do not have to scroll every question.</p>
          </div>
        </div>
      </Card>

      <Card className="p-2.5">
        <div className="flex h-11 items-center gap-2 rounded-2xl border px-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
          <Search size={16} style={{ color: T.textSubtle }} />
          <input
            value={deckQuery}
            onChange={(event) => setDeckQuery(event.target.value)}
            placeholder="Search category decks"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-semibold"
            style={{ color: T.text }}
          />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {filteredDecks.map((deck) => (
          <DeckCard key={deck.key} deck={deck} onSelect={onSelect} />
        ))}
      </div>

      {filteredDecks.length === 0 && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>No category deck matches your search.</Card>}
    </div>
  );
}

function FlashCard({ question, index, showAll, score, onScore }) {
  const [open, setOpen] = useState(false);
  const visible = showAll || open;
  const answer = getAnswerText(question);
  const categoryLabel = getCategoryLabel(question);

  useEffect(() => {
    if (!showAll) setOpen(false);
  }, [showAll]);

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((value) => !value)} className="w-full p-4 text-left active:scale-[0.995]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.14em]" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
                QUESTION {String(index + 1).padStart(2, "0")}
              </span>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: T.surface, color: T.textMuted }}>
                {categoryLabel}
              </span>
              {score === "known" && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black" style={{ backgroundColor: "#F3FBF6", color: T.success }}>
                  <CheckCircle2 size={12} /> Knew it
                </span>
              )}
              {score === "review" && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black" style={{ backgroundColor: T.dangerBg, color: T.danger }}>
                  <XCircle size={12} /> Review
                </span>
              )}
            </div>
            {question.source_publication && (
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: T.textSubtle }}>
                {question.source_publication}
              </p>
            )}
            <h2 className="text-lg font-black leading-snug" style={{ color: T.navy }}>{question.question}</h2>
          </div>
          <ChevronDown size={19} className={visible ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} style={{ color: T.textSubtle }} />
        </div>
      </button>

      <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: T.borderSoft }}>
        <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.textMuted }}>Correct answer</p>
        {visible ? (
          <button
            type="button"
            onClick={() => {
              if (!showAll) setOpen(false);
            }}
            className="mt-2 w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]"
            style={{ borderColor: "rgba(49,151,84,0.24)", backgroundColor: "#F3FBF6" }}
          >
            <p className="text-base font-black leading-6" style={{ color: T.success }}>{answer}</p>
            {question.explanation && <p className="mt-2 text-sm leading-6" style={{ color: T.textMuted }}>{question.explanation}</p>}
            {!showAll && <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>Tap again to hide answer</p>}
          </button>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="mt-2 w-full rounded-2xl border border-dashed p-3 text-center transition active:scale-[0.99]" style={{ borderColor: T.border, backgroundColor: T.surface }}>
            <p className="text-sm font-bold" style={{ color: T.textMuted }}>**** tap or click to see the answer ****</p>
          </button>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onScore(question.id, "known")} className="flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-black" style={{ borderColor: score === "known" ? "rgba(49,151,84,0.38)" : T.border, backgroundColor: score === "known" ? "#F3FBF6" : T.card, color: score === "known" ? T.success : T.navy }}>
            <CheckCircle2 size={16} /> I knew it
          </button>
          <button type="button" onClick={() => onScore(question.id, "review")} className="flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-black" style={{ borderColor: score === "review" ? "rgba(185,28,28,0.30)" : T.border, backgroundColor: score === "review" ? T.dangerBg : T.card, color: score === "review" ? T.danger : T.navy }}>
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
  const [deckQuery, setDeckQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDeckKey, setSelectedDeckKey] = useState(null);

  const decks = useMemo(() => {
    const byCategory = new Map();
    questions.forEach((question) => {
      const label = getCategoryLabel(question);
      if (!byCategory.has(label)) byCategory.set(label, []);
      byCategory.get(label).push(question);
    });

    const categoryDecks = [...byCategory.entries()]
      .map(([label, deckQuestions]) => ({
        key: label,
        label,
        questions: deckQuestions,
        total: deckQuestions.length,
        summary: getQuestionScoreSummary(scores, deckQuestions),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [
      {
        key: ALL_DECK_KEY,
        label: "All questions",
        questions,
        total: questions.length,
        summary: getQuestionScoreSummary(scores, questions),
      },
      ...categoryDecks,
    ];
  }, [questions, scores]);

  const selectedDeck = useMemo(() => {
    if (!selectedDeckKey) return null;
    return decks.find((deck) => deck.key === selectedDeckKey) || null;
  }, [decks, selectedDeckKey]);

  useEffect(() => {
    if (selectedDeckKey && !selectedDeck) setSelectedDeckKey(null);
  }, [selectedDeckKey, selectedDeck]);

  const deckQuestions = selectedDeck?.questions || [];

  const filteredQuestions = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return deckQuestions.filter((question) => {
      const score = scores[question.id];
      if (statusFilter === "known" && score !== "known") return false;
      if (statusFilter === "review" && score !== "review") return false;
      if (statusFilter === "unscored" && score) return false;
      if (!search) return true;

      const haystack = [
        question.question,
        question.category,
        question.source_publication,
        question.explanation,
        getAnswerText(question),
        question.question_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [deckQuestions, scores, searchQuery, statusFilter]);

  const allSummary = useMemo(() => getQuestionScoreSummary(scores, questions), [scores, questions]);
  const selectedSummary = useMemo(() => getQuestionScoreSummary(scores, deckQuestions), [scores, deckQuestions]);

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

    const loadedQuestions = json.data || [];
    setQuestions(loadedQuestions);
    setScores(loadDraftScores(loadedQuestions.map((q) => q.id)));
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  function handleScore(questionId, value) {
    setScores((current) => {
      const next = { ...current, [questionId]: value };
      saveDraftScores(next);
      return next;
    });
  }

  function resetScores() {
    setScores({});
    saveDraftScores({});
  }

  function selectDeck(deck) {
    setSelectedDeckKey(deck.key);
    setSearchQuery("");
    setStatusFilter("all");
    setFilterOpen(false);
    setShowAll(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToDecks() {
    setSelectedDeckKey(null);
    setSearchQuery("");
    setFilterOpen(false);
    setShowAll(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <AppShell hideNav>
      <ToolPage title="Study all questions" eyebrow="Board Prep" icon={BookOpen} onBack={() => router.push("/tools/board-prep")} backLabel="Back to Board Prep">
        <div className="space-y-4">
          {loading && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>Loading study decks...</Card>}
          {!loading && error && (
            <Card className="p-5 text-center">
              <p className="font-bold" style={{ color: T.danger }}>{error}</p>
              <button onClick={() => router.push("/tools/board-prep")} className="mt-4 rounded-2xl px-5 py-2 font-bold text-white" style={{ backgroundColor: T.navy }}>
                Back to Board Prep
              </button>
            </Card>
          )}
          {!loading && !error && questions.length === 0 && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>No questions available yet.</Card>}

          {!loading && !error && questions.length > 0 && !selectedDeck && (
            <>
              <ScoreHero summary={allSummary} filteredCount={questions.length} totalCount={questions.length} title="Overall study score" subtitle="all decks" />
              <DeckSelection decks={decks} deckQuery={deckQuery} setDeckQuery={setDeckQuery} onSelect={selectDeck} />
              <AddQuestionRequestPanel />
            </>
          )}

          {!loading && !error && questions.length > 0 && selectedDeck && (
            <>
              <ScoreHero summary={selectedSummary} filteredCount={filteredQuestions.length} totalCount={deckQuestions.length} title={`${selectedDeck.label} deck`} subtitle="draft saved" />
              <button
                type="button"
                onClick={backToDecks}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-black"
                style={{ borderColor: T.border, backgroundColor: T.card, color: T.navy }}
              >
                <Layers size={16} /> Back to category decks
              </button>

              <div className="sticky top-0 z-20 -mx-1 rounded-b-[1.5rem] px-1 pb-2 pt-1" style={{ backgroundColor: T.bg }}>
                <StudyControls
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterOpen={filterOpen}
                  setFilterOpen={setFilterOpen}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  showAll={showAll}
                  setShowAll={setShowAll}
                  resetScores={resetScores}
                />
              </div>

              <AddQuestionRequestPanel />

              {filteredQuestions.length === 0 && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>No questions match your search or filter in this deck.</Card>}

              <div className="space-y-4 pb-8">
                {filteredQuestions.map((question, index) => (
                  <FlashCard key={question.id} question={question} index={index} showAll={showAll} score={scores[question.id]} onScore={handleScore} />
                ))}
              </div>
            </>
          )}
        </div>
      </ToolPage>
    </AppShell>
  );
}
