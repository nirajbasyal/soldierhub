"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  PlusCircle,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import ToolPage from "@/components/ui/ToolPage";

const ALL_DECK_KEY = "__all__";
const PUBLIC_SCORE_KEY = "soldierhub:board-prep-public-study-scores:v1";

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
  return question?.correct_answer || question?.[`option_${question?.correct_option}`] || "Answer not available.";
}

function getCategoryLabel(question) {
  return question?.category?.trim() || "General";
}

function getPublication(question) {
  return question?.source_publication || question?.publication || question?.regulation || null;
}

function getDeckPublicationLabel(deckQuestions = []) {
  const publications = [
    ...new Set(deckQuestions.map((question) => String(getPublication(question) || "").trim()).filter(Boolean)),
  ];

  if (publications.length === 0) return null;
  if (publications.length === 1) return publications[0];
  return `${publications[0]} +${publications.length - 1} more`;
}

function loadScores(validIds = []) {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(PUBLIC_SCORE_KEY) || "{}");
    const valid = new Set(validIds);
    return Object.fromEntries(
      Object.entries(parsed || {}).filter(([id, value]) => valid.has(id) && ["known", "review"].includes(value))
    );
  } catch {
    return {};
  }
}

function saveScores(scores) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PUBLIC_SCORE_KEY, JSON.stringify(scores || {}));
}

function getScoreSummary(scores, questions = []) {
  const validIds = new Set(questions.map((question) => question.id));
  const values = Object.entries(scores || {})
    .filter(([id]) => validIds.has(id))
    .map(([, value]) => value);
  const known = values.filter((value) => value === "known").length;
  const review = values.filter((value) => value === "review").length;
  const attempted = known + review;
  const total = questions.length;
  const percent = attempted ? Math.round((known / attempted) * 100) : 0;
  return { known, review, attempted, total, percent };
}

function ScoreHero({ summary, filteredCount, totalCount, title, subtitle }) {
  const progress = summary.total ? Math.round((summary.attempted / summary.total) * 100) : 0;

  return (
    <Card className="overflow-hidden p-4" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F7FBFF 48%, #EEF6FF 100%)", borderColor: "#D9E5F2" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: T.brandRed }}>{title}</p>
          <h2 className="mt-1 text-2xl font-black leading-tight" style={{ color: T.navy }}>{summary.known}/{summary.attempted || 0} known</h2>
          <p className="mt-1 text-xs font-semibold" style={{ color: T.textMuted }}>{summary.review} need review · {summary.total - summary.attempted} not scored</p>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: T.textSubtle }}>Showing {filteredCount} of {totalCount} questions · {subtitle}</p>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4" style={{ borderColor: T.textMuted, backgroundColor: "#FFFFFF", color: T.textMuted }}>
          <span className="text-lg font-black">{summary.percent}%</span>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: T.borderSoft }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: T.brandRed }} />
      </div>
    </Card>
  );
}

function AccuracyNotice() {
  return (
    <div className="-mt-1 flex items-start gap-1.5 rounded-xl border px-2 py-1 text-[10px] font-semibold leading-4 shadow-sm" style={{ backgroundColor: "rgba(255,255,255,0.58)", borderColor: T.borderSoft, color: T.textMuted }}>
      <AlertTriangle size={11} className="mt-0.5 shrink-0" style={{ color: T.gold }} />
      <p><span className="font-black" style={{ color: T.navy }}>Notice:</span> Soldier Hub questions may be inaccurate or outdated. Verify with official regs/publications and chain of command.</p>
    </div>
  );
}

function PublicRequestPrompt() {
  const { setAuthModal = () => {} } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 p-3 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
            <PlusCircle size={19} />
          </span>
          <div className="min-w-0">
            <p className="font-black leading-tight" style={{ color: T.navy }}>Help Soldier Hub improve Board Prep.</p>
            <p className="mt-0.5 text-xs leading-5" style={{ color: T.textMuted }}>Sign in to submit add, update, or delete requests.</p>
          </div>
        </div>
        <ChevronDown size={18} className={open ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} style={{ color: T.textMuted }} />
      </button>

      {open && (
        <div className="border-t p-3" style={{ borderColor: T.borderSoft }}>
          <div className="rounded-[1.35rem] border p-4 text-center" style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}>
            <ShieldCheck className="mx-auto" size={30} style={{ color: T.brandRed }} />
            <p className="mt-2 text-base font-black" style={{ color: T.navy }}>Sign in to submit a correction</p>
            <p className="mx-auto mt-1 max-w-sm text-xs font-semibold leading-5" style={{ color: T.textMuted }}>
              Public users can study all questions. Add, update, and delete requests require a signed-in account so admins can review real submissions.
            </p>
            <button type="button" onClick={() => setAuthModal("login")} className="mt-4 h-11 w-full rounded-2xl font-black text-white" style={{ backgroundColor: T.brandRed }}>
              Sign in to submit request
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function MiniStat({ label, value, bg, color }) {
  return (
    <div className="rounded-2xl p-2 text-center" style={{ backgroundColor: bg }}>
      <p className="text-base font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: T.textMuted }}>{label}</p>
    </div>
  );
}

function DeckCard({ deck, onSelect }) {
  const notScored = Math.max(deck.total - deck.summary.attempted, 0);
  const progress = deck.total ? Math.round((deck.summary.attempted / deck.total) * 100) : 0;
  const isAll = deck.key === ALL_DECK_KEY;
  const questionCountText = `${deck.total} question${deck.total === 1 ? "" : "s"}`;
  const metaText = isAll || !deck.publicationLabel ? questionCountText : `${questionCountText} · ${deck.publicationLabel}`;

  return (
    <button type="button" onClick={() => onSelect(deck)} className="group rounded-[1.65rem] border p-4 text-left shadow-sm transition active:scale-[0.99]" style={{ backgroundColor: T.card, borderColor: isAll ? "rgba(179,25,66,0.30)" : T.border, boxShadow: isAll ? "0 12px 26px rgba(179,25,66,0.08)" : undefined }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: isAll ? T.redBg : T.blueSoft, color: isAll ? T.brandRed : T.blue }}>
            <Layers size={20} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="line-clamp-2 text-lg font-black leading-tight" style={{ color: T.navy }}>{deck.label}</h3>
            <p className="mt-1 truncate text-xs font-semibold" style={{ color: T.textMuted }} title={metaText}>{metaText}</p>
          </div>
        </div>
        <ChevronRight size={20} className="mt-1 shrink-0 transition group-hover:translate-x-0.5" style={{ color: T.textSubtle }} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Known" value={deck.summary.known} bg="#F3FBF6" color={T.success} />
        <MiniStat label="Review" value={deck.summary.review} bg={T.dangerBg} color={T.danger} />
        <MiniStat label="New" value={notScored} bg={T.surface} color={T.navy} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: T.borderSoft }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: isAll ? T.brandRed : T.blue }} />
      </div>
    </button>
  );
}

function FlashCard({ question, index, showAll, score, onScore }) {
  const [open, setOpen] = useState(false);
  const visible = showAll || open;
  const answer = getAnswerText(question);

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((value) => !value)} className="w-full p-4 text-left active:scale-[0.995]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.14em]" style={{ backgroundColor: T.blueSoft, color: T.blue }}>QUESTION {String(index + 1).padStart(2, "0")}</span>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: T.surface, color: T.textMuted }}>{getCategoryLabel(question)}</span>
              {score === "known" && <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={{ backgroundColor: "#F3FBF6", color: T.success }}>Known</span>}
              {score === "review" && <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={{ backgroundColor: T.dangerBg, color: T.danger }}>Review</span>}
            </div>
            {question.source_publication && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: T.textSubtle }}>{question.source_publication}</p>}
            <h2 className="text-lg font-black leading-snug" style={{ color: T.navy }}>{question.question}</h2>
          </div>
          <ChevronDown size={19} className={visible ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} style={{ color: T.textSubtle }} />
        </div>
      </button>
      <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: T.borderSoft }}>
        <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.textMuted }}>Correct answer</p>
        {visible ? (
          <button type="button" onClick={() => !showAll && setOpen(false)} className="mt-2 w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]" style={{ borderColor: "rgba(49,151,84,0.24)", backgroundColor: "#F3FBF6" }}>
            <p className="text-base font-black leading-6" style={{ color: T.success }}>{answer}</p>
            {question.explanation && <p className="mt-2 text-sm leading-6" style={{ color: T.textMuted }}>{question.explanation}</p>}
          </button>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="mt-2 w-full rounded-2xl border border-dashed p-3 text-center transition active:scale-[0.99]" style={{ borderColor: T.border, backgroundColor: T.surface }}>
            <p className="text-sm font-bold" style={{ color: T.textMuted }}>**** tap or click to see the answer ****</p>
          </button>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onScore(question.id, "known")} className="flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-black" style={{ borderColor: score === "known" ? "rgba(49,151,84,0.38)" : T.border, backgroundColor: score === "known" ? "#F3FBF6" : T.card, color: score === "known" ? T.success : T.navy }}><CheckCircle2 size={16} /> I knew it</button>
          <button type="button" onClick={() => onScore(question.id, "review")} className="flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-black" style={{ borderColor: score === "review" ? "rgba(185,28,28,0.30)" : T.border, backgroundColor: score === "review" ? T.dangerBg : T.card, color: score === "review" ? T.danger : T.navy }}><XCircle size={16} /> Need review</button>
        </div>
      </div>
    </Card>
  );
}

export default function PublicBoardPrepStudyClient({ initialQuestions = [], initialError = null }) {
  const router = useRouter();
  const [questions] = useState(initialQuestions || []);
  const [scores, setScores] = useState(() => loadScores((initialQuestions || []).map((question) => question.id)));
  const [deckQuery, setDeckQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeckKey, setSelectedDeckKey] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const decks = useMemo(() => {
    const byCategory = new Map();
    questions.forEach((question) => {
      const label = getCategoryLabel(question);
      if (!byCategory.has(label)) byCategory.set(label, []);
      byCategory.get(label).push(question);
    });

    const categoryDecks = [...byCategory.entries()]
      .map(([label, deckQuestions]) => ({ key: label, label, questions: deckQuestions, total: deckQuestions.length, publicationLabel: getDeckPublicationLabel(deckQuestions), summary: getScoreSummary(scores, deckQuestions) }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ key: ALL_DECK_KEY, label: "All questions", questions, total: questions.length, publicationLabel: null, summary: getScoreSummary(scores, questions) }, ...categoryDecks];
  }, [questions, scores]);

  const selectedDeck = useMemo(() => (selectedDeckKey ? decks.find((deck) => deck.key === selectedDeckKey) || null : null), [decks, selectedDeckKey]);
  const deckQuestions = selectedDeck?.questions || [];
  const allSummary = useMemo(() => getScoreSummary(scores, questions), [scores, questions]);
  const selectedSummary = useMemo(() => getScoreSummary(scores, deckQuestions), [scores, deckQuestions]);

  const filteredDecks = useMemo(() => {
    const search = deckQuery.trim().toLowerCase();
    if (!search) return decks;
    return decks.filter((deck) => [deck.label, deck.publicationLabel].filter(Boolean).join(" ").toLowerCase().includes(search));
  }, [decks, deckQuery]);

  const filteredQuestions = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return deckQuestions;
    return deckQuestions.filter((question) => [question.question, question.category, question.source_publication, question.explanation, getAnswerText(question)].filter(Boolean).join(" ").toLowerCase().includes(search));
  }, [deckQuestions, searchQuery]);

  function handleTopBack() {
    if (selectedDeck) {
      setSelectedDeckKey(null);
      setSearchQuery("");
      setShowAll(false);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    router.push("/");
  }

  function handleScore(questionId, value) {
    setScores((current) => {
      const next = { ...current, [questionId]: value };
      saveScores(next);
      return next;
    });
  }

  return (
    <AppShell hideNav>
      <ToolPage title="Study all questions" eyebrow="Board Prep" icon={BookOpen} onBack={handleTopBack} backLabel={selectedDeck ? "Back to category decks" : "Back to feed"}>
        <div className="space-y-4">
          {initialError && <Card className="p-5 text-center"><p className="font-bold" style={{ color: T.danger }}>{initialError}</p></Card>}
          {!initialError && questions.length === 0 && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>No questions available yet.</Card>}

          {!initialError && questions.length > 0 && !selectedDeck && (
            <>
              <ScoreHero summary={allSummary} filteredCount={questions.length} totalCount={questions.length} title="Overall study score" subtitle="public study" />
              <AccuracyNotice />
              <PublicRequestPrompt />
              <Card className="p-4" style={{ background: `linear-gradient(135deg, ${T.navy}, #163b63)`, borderColor: "rgba(255,255,255,0.12)" }}>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white"><Layers size={22} /></div>
                  <div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/65">Study decks</p><h2 className="mt-1 text-2xl font-serif font-black text-white">Choose a category</h2></div>
                </div>
              </Card>
              <Card className="p-2.5">
                <div className="flex h-11 items-center gap-2 rounded-2xl border px-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
                  <Search size={16} style={{ color: T.textSubtle }} />
                  <input value={deckQuery} onChange={(event) => setDeckQuery(event.target.value)} placeholder="Search category decks" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-semibold" style={{ color: T.text }} />
                </div>
              </Card>
              <div className="grid gap-3 md:grid-cols-2">{filteredDecks.map((deck) => <DeckCard key={deck.key} deck={deck} onSelect={(selected) => setSelectedDeckKey(selected.key)} />)}</div>
            </>
          )}

          {!initialError && questions.length > 0 && selectedDeck && (
            <>
              <ScoreHero summary={selectedSummary} filteredCount={filteredQuestions.length} totalCount={deckQuestions.length} title={`${selectedDeck.label} deck`} subtitle="public study" />
              <Card className="p-4" style={{ backgroundColor: T.surface }}>
                <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: T.brandRed }}>Studying</p>
                <h2 className="mt-1 text-2xl font-serif font-black leading-tight" style={{ color: T.navy }}>{selectedDeck.label}</h2>
                <p className="mt-1 text-xs font-semibold" style={{ color: T.textMuted }}>{selectedDeck.total} question{selectedDeck.total === 1 ? "" : "s"} in this category</p>
              </Card>
              <Card className="p-2.5">
                <div className="flex gap-2">
                  <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
                    <Search size={16} style={{ color: T.textSubtle }} />
                    <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search this deck" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-semibold" style={{ color: T.text }} />
                  </div>
                  <button type="button" onClick={() => setShowAll((value) => !value)} className="flex h-11 shrink-0 items-center justify-center rounded-2xl border px-3 text-xs font-black" style={{ borderColor: showAll ? "rgba(49,151,84,0.28)" : T.border, backgroundColor: showAll ? "#F3FBF6" : T.card, color: showAll ? T.success : T.navy }}>{showAll ? "Hide answers" : "See answers"}</button>
                </div>
              </Card>
              <PublicRequestPrompt />
              {filteredQuestions.length === 0 && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>No questions match your search in this deck.</Card>}
              <div className="space-y-4 pb-8">{filteredQuestions.map((question, index) => <FlashCard key={question.id} question={question} index={index} showAll={showAll} score={scores[question.id]} onScore={handleScore} />)}</div>
            </>
          )}
        </div>
      </ToolPage>
    </AppShell>
  );
}
