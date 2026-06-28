"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
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

function getAnswerText(question) {
  return question?.correct_answer || question?.[`option_${question?.correct_option}`] || "Answer not available.";
}

function getCategoryLabel(question) {
  return question?.category?.trim() || "General";
}

function getQuestionSourcePublication(question) {
  return (
    question?.source_publication ||
    question?.sourcePublication ||
    question?.regulation ||
    question?.publication ||
    question?.source ||
    null
  );
}

function getDeckPublicationLabel(deckQuestions = []) {
  const publications = [
    ...new Set(
      deckQuestions
        .map((question) => String(getQuestionSourcePublication(question) || "").trim())
        .filter(Boolean)
    ),
  ];

  if (publications.length === 0) return null;
  if (publications.length === 1) return publications[0];

  return `${publications[0]} +${publications.length - 1} more`;
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

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: T.textSubtle }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border px-3 text-sm font-semibold outline-none"
        style={{ borderColor: T.border, color: T.text }}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows, placeholder, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: T.textSubtle }}>
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-2xl border p-3 text-sm font-semibold outline-none"
        style={{ borderColor: T.border, color: T.text }}
        placeholder={placeholder}
      />
    </label>
  );
}

function ScoreHero({ summary, filteredCount, totalCount, title, subtitle }) {
  const progress = summary.total ? Math.round((summary.attempted / summary.total) * 100) : 0;
  const tone = summary.percent >= 80 ? T.success : summary.percent >= 50 ? T.gold : T.textMuted;
  const toneBg = summary.percent >= 80 ? "#F3FBF6" : summary.percent >= 50 ? T.goldBg : "#FFFFFF";

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
          style={{ borderColor: tone, backgroundColor: toneBg, color: tone }}
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

function AccuracyNotice() {
  return (
    <div
      className="-mt-1 flex items-start gap-1.5 rounded-xl border px-2 py-1 text-[10px] font-semibold leading-4 shadow-sm"
      style={{ backgroundColor: "rgba(255,255,255,0.58)", borderColor: T.borderSoft, color: T.textMuted }}
    >
      <AlertTriangle size={11} className="mt-0.5 shrink-0" style={{ color: T.gold }} />
      <p>
        <span className="font-black" style={{ color: T.navy }}>Notice:</span> Soldier Hub questions may be inaccurate or outdated. Verify with official regs/publications and chain of command. Send update/delete requests for fixes.
      </p>
    </div>
  );
}

function RequestSection({ active, tone = "red", icon, title, description, onClick, children }) {
  const isBlue = tone === "blue";
  const activeBorder = isBlue ? "rgba(37,99,145,0.34)" : "rgba(179,25,66,0.34)";
  const activeBg = isBlue ? "rgba(238,246,255,0.92)" : "rgba(253,236,240,0.92)";
  const iconBg = isBlue ? T.blueSoft : T.redBg;
  const iconColor = isBlue ? T.blue : T.brandRed;

  return (
    <div
      className="rounded-[1.4rem] border transition"
      style={{
        backgroundColor: active ? activeBg : T.surface,
        borderColor: active ? activeBorder : T.borderSoft,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-3 p-3 text-left active:scale-[0.995]"
      >
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black leading-tight" style={{ color: T.navy }}>
            {title}
          </span>
          <span className="mt-1 block text-xs font-semibold leading-5" style={{ color: T.textMuted }}>
            {description}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={active ? "mt-2 shrink-0 rotate-180 transition" : "mt-2 shrink-0 transition"}
          style={{ color: T.textSubtle }}
        />
      </button>
      {active && <div className="border-t p-3 pt-3" style={{ borderColor: T.borderSoft }}>{children}</div>}
    </div>
  );
}

function RequestPanel() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [addMode, setAddMode] = useState("single");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [action, setAction] = useState("update");
  const [questionNumber, setQuestionNumber] = useState("");
  const [category, setCategory] = useState("");
  const [explanation, setExplanation] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  function toggleMode(nextMode) {
    setStatus(null);
    setMode((current) => (current === nextMode ? null : nextMode));
  }

  async function sendRequest(payload) {
    const token = await getAccessToken();
    const res = await fetch("/api/board-prep/request", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not submit request.");
  }

  async function submitRequest() {
    if (!mode) {
      setStatus({ type: "error", text: "Choose add or update/remove first." });
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      if (mode === "add") {
        const isSingle = addMode === "single";
        const q = question.trim();
        const a = answer.trim();
        const bulk = bulkText.trim();

        if (isSingle && (!q || !a)) throw new Error("Add both question and answer.");
        if (!isSingle && !bulk) throw new Error("Paste the questions and answers first.");

        const message = isSingle
          ? `User submitted one Board Prep flashcard.\n\nQuestion: ${q}\n\nAnswer: ${a}`
          : `User submitted multiple Board Prep questions for review.\n\n${bulk}`;

        await sendRequest({
          request_type: "add",
          question_id: null,
          category: "User submitted",
          message,
          suggested_question: isSingle ? q : bulk.slice(0, 500),
          suggested_answer: isSingle ? a : bulk.slice(0, 900),
        });

        setQuestion("");
        setAnswer("");
        setBulkText("");
      } else {
        const numberText = questionNumber.trim();
        const categoryText = category.trim();
        const explanationText = explanation.trim();

        if (!numberText || !categoryText || !explanationText) {
          throw new Error("Add question number, category, and explanation.");
        }

        const requestType = action === "delete" ? "remove" : "update";
        await sendRequest({
          request_type: requestType,
          question_id: null,
          category: categoryText,
          message: `User requested to ${action} a Board Prep question.\n\nQuestion number: ${numberText}\nCategory: ${categoryText}\nExplanation: ${explanationText}`,
          suggested_question: `Question number: ${numberText}`,
          suggested_answer: explanationText,
        });

        setQuestionNumber("");
        setCategory("");
        setExplanation("");
      }

      setStatus({ type: "success", text: "Submitted to admin for review." });
      setMode(null);
    } catch (err) {
      setStatus({ type: "error", text: err.message || "Could not submit request." });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setMode(null);
          setStatus(null);
        }}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
            <PlusCircle size={19} />
          </span>
          <div className="min-w-0">
            <p className="font-black leading-tight" style={{ color: T.navy }}>Help Soldier Hub improve Board Prep.</p>
            <p className="mt-0.5 text-xs leading-5" style={{ color: T.textMuted }}>Add new questions or suggest updates/removal for admin review.</p>
          </div>
        </div>
        <ChevronDown size={18} className={open ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} style={{ color: T.textMuted }} />
      </button>

      {open && (
        <div className="space-y-3 border-t p-3" style={{ borderColor: T.borderSoft }}>
          <RequestSection
            active={mode === "add"}
            tone="red"
            icon={<PlusCircle size={18} />}
            title="Add new questions"
            description="Submit a brand-new board question. Single and multiple options belong here only."
            onClick={() => toggleMode("add")}
          >
            <div className="rounded-[1.15rem] border bg-white/70 p-2" style={{ borderColor: T.borderSoft }}>
              <p className="px-1 pb-2 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.textSubtle }}>Choose add format</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setAddMode("single")} className="h-10 rounded-2xl border text-sm font-black" style={{ borderColor: addMode === "single" ? T.navy : T.border, backgroundColor: addMode === "single" ? T.navy : T.card, color: addMode === "single" ? "#fff" : T.textMuted }}>Single question</button>
                <button type="button" onClick={() => setAddMode("multiple")} className="h-10 rounded-2xl border text-sm font-black" style={{ borderColor: addMode === "multiple" ? T.navy : T.border, backgroundColor: addMode === "multiple" ? T.navy : T.card, color: addMode === "multiple" ? "#fff" : T.textMuted }}>Multiple questions</button>
              </div>
            </div>

            {addMode === "single" ? (
              <div className="mt-3 space-y-3">
                <TextArea label="Question input" value={question} onChange={setQuestion} rows={3} placeholder="Type the board question." />
                <TextArea label="Answer" value={answer} onChange={setAnswer} rows={3} placeholder="Type the correct answer." />
              </div>
            ) : (
              <TextArea label="Multiple questions" value={bulkText} onChange={setBulkText} rows={7} className="mt-3" placeholder={"Enter multiple questions and answers here.\n\nExample:\nQ: What does AR 670-1 cover?\nA: Wear and appearance of Army uniforms and insignia."} />
            )}
          </RequestSection>

          <RequestSection
            active={mode === "update_delete"}
            tone="blue"
            icon={<Search size={18} />}
            title="Update or remove existing questions"
            description="Use this only when a current question is wrong, outdated, duplicated, or should be removed."
            onClick={() => toggleMode("update_delete")}
          >
            <div className="rounded-[1.15rem] border bg-white/70 p-2" style={{ borderColor: T.borderSoft }}>
              <p className="px-1 pb-2 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.textSubtle }}>Request type</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setAction("update")} className="h-10 rounded-2xl border text-sm font-black" style={{ borderColor: action === "update" ? T.navy : T.border, backgroundColor: action === "update" ? T.navy : T.card, color: action === "update" ? "#fff" : T.textMuted }}>Update</button>
                <button type="button" onClick={() => setAction("delete")} className="h-10 rounded-2xl border text-sm font-black" style={{ borderColor: action === "delete" ? T.brandRed : T.border, backgroundColor: action === "delete" ? T.redBg : T.card, color: action === "delete" ? T.brandRed : T.textMuted }}>Delete</button>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <TextInput label="Question number" value={questionNumber} onChange={setQuestionNumber} placeholder="Example: 12" />
              <TextInput label="Category" value={category} onChange={setCategory} placeholder="Example: Leadership" />
              <TextArea label="Explanation" value={explanation} onChange={setExplanation} rows={4} placeholder="Explain what should be updated or why it should be deleted." />
            </div>
          </RequestSection>

          {mode && (
            <button
              type="button"
              onClick={submitRequest}
              disabled={sending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl font-black text-white disabled:opacity-50"
              style={{ backgroundColor: T.brandRed }}
            >
              <Send size={15} /> {sending ? "Submitting..." : mode === "add" ? "Submit new question" : "Submit update/removal request"}
            </button>
          )}
          {status && <p className="text-xs font-semibold" style={{ color: status.type === "success" ? T.success : T.danger }}>{status.text}</p>}
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

function DeckSelection({ decks, deckQuery, setDeckQuery, onSelect }) {
  const filteredDecks = useMemo(() => {
    const search = deckQuery.trim().toLowerCase();
    if (!search) return decks;
    return decks.filter((deck) => [deck.label, deck.publicationLabel].filter(Boolean).join(" ").toLowerCase().includes(search));
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
        {filteredDecks.map((deck) => <DeckCard key={deck.key} deck={deck} onSelect={onSelect} />)}
      </div>
      {filteredDecks.length === 0 && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>No category deck matches your search.</Card>}
    </div>
  );
}

function SelectedDeckHeading({ deck }) {
  return (
    <Card className="p-4" style={{ backgroundColor: T.surface }}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: T.brandRed }}>Studying</p>
      <h2 className="mt-1 text-2xl font-serif font-black leading-tight" style={{ color: T.navy }}>{deck.label}</h2>
      <p className="mt-1 text-xs font-semibold" style={{ color: T.textMuted }}>{deck.total} question{deck.total === 1 ? "" : "s"} in this category</p>
    </Card>
  );
}

function StudyControls({ searchQuery, setSearchQuery, filterOpen, setFilterOpen, statusFilter, setStatusFilter, showAll, setShowAll, resetScores }) {
  const filters = [["all", "All"], ["known", "I knew it"], ["review", "Need review"], ["unscored", "Not scored"]];
  const label = { all: "All", known: "I knew it", review: "Need review", unscored: "Not scored" }[statusFilter] || "All";

  return (
    <Card className="p-2.5">
      <div className="flex gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
          <Search size={16} style={{ color: T.textSubtle }} />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search this deck" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-semibold" style={{ color: T.text }} />
        </div>
        <button type="button" onClick={() => setFilterOpen((value) => !value)} className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border px-3" style={{ borderColor: filterOpen ? T.brandRed : T.border, backgroundColor: filterOpen ? T.redBg : T.card, color: filterOpen ? T.brandRed : T.navy }}>
          <Filter size={17} /><span className="max-w-[78px] truncate text-xs font-black">{label}</span>
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setShowAll((value) => !value)} className="flex h-9 items-center justify-center gap-2 rounded-2xl border text-xs font-black" style={{ borderColor: showAll ? "rgba(49,151,84,0.28)" : T.border, backgroundColor: showAll ? "#F3FBF6" : T.card, color: showAll ? T.success : T.navy }}>
          {showAll ? <EyeOff size={14} /> : <Eye size={14} />}{showAll ? "Hide answers" : "See answers"}
        </button>
        <button type="button" onClick={resetScores} className="flex h-9 items-center justify-center gap-2 rounded-2xl border text-xs font-black" style={{ borderColor: T.border, backgroundColor: T.card, color: T.navy }}><RotateCcw size={14} /> Reset score</button>
      </div>
      {filterOpen && (
        <div className="mt-2 rounded-2xl border p-2" style={{ borderColor: T.borderSoft, backgroundColor: T.surface }}>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filters.map(([value, text]) => <button key={value} type="button" onClick={() => { setStatusFilter(value); setFilterOpen(false); }} className="shrink-0 rounded-full border px-3 py-2 text-xs font-black" style={{ borderColor: statusFilter === value ? T.brandRed : T.border, backgroundColor: statusFilter === value ? T.redBg : T.card, color: statusFilter === value ? T.brandRed : T.textMuted }}>{text}</button>)}
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
  const categoryLabel = getCategoryLabel(question);

  useEffect(() => { if (!showAll) setOpen(false); }, [showAll]);

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((value) => !value)} className="w-full p-4 text-left active:scale-[0.995]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.14em]" style={{ backgroundColor: T.blueSoft, color: T.blue }}>QUESTION {String(index + 1).padStart(2, "0")}</span>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: T.surface, color: T.textMuted }}>{categoryLabel}</span>
              {score === "known" && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black" style={{ backgroundColor: "#F3FBF6", color: T.success }}><CheckCircle2 size={12} /> Knew it</span>}
              {score === "review" && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black" style={{ backgroundColor: T.dangerBg, color: T.danger }}><XCircle size={12} /> Review</span>}
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
          <button type="button" onClick={() => { if (!showAll) setOpen(false); }} className="mt-2 w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]" style={{ borderColor: "rgba(49,151,84,0.24)", backgroundColor: "#F3FBF6" }}>
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
          <button type="button" onClick={() => onScore(question.id, "known")} className="flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-black" style={{ borderColor: score === "known" ? "rgba(49,151,84,0.38)" : T.border, backgroundColor: score === "known" ? "#F3FBF6" : T.card, color: score === "known" ? T.success : T.navy }}><CheckCircle2 size={16} /> I knew it</button>
          <button type="button" onClick={() => onScore(question.id, "review")} className="flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-black" style={{ borderColor: score === "review" ? "rgba(185,28,28,0.30)" : T.border, backgroundColor: score === "review" ? T.dangerBg : T.card, color: score === "review" ? T.danger : T.navy }}><XCircle size={16} /> Need review</button>
        </div>
      </div>
    </Card>
  );
}

export default function BoardPrepStudyClient() {
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
        publicationLabel: getDeckPublicationLabel(deckQuestions),
        summary: getScoreSummary(scores, deckQuestions),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [
      { key: ALL_DECK_KEY, label: "All questions", questions, total: questions.length, publicationLabel: null, summary: getScoreSummary(scores, questions) },
      ...categoryDecks,
    ];
  }, [questions, scores]);

  const selectedDeck = useMemo(
    () => (selectedDeckKey ? decks.find((deck) => deck.key === selectedDeckKey) || null : null),
    [decks, selectedDeckKey]
  );

  const deckQuestions = selectedDeck?.questions || [];

  const filteredQuestions = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return deckQuestions.filter((question) => {
      const score = scores[question.id];
      if (statusFilter === "known" && score !== "known") return false;
      if (statusFilter === "review" && score !== "review") return false;
      if (statusFilter === "unscored" && score) return false;
      if (!search) return true;

      return [question.question, question.category, question.source_publication, question.explanation, getAnswerText(question)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [deckQuestions, scores, searchQuery, statusFilter]);

  const allSummary = useMemo(() => getScoreSummary(scores, questions), [scores, questions]);
  const selectedSummary = useMemo(() => getScoreSummary(scores, deckQuestions), [scores, deckQuestions]);

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
    setScores(loadDraftScores(loadedQuestions.map((question) => question.id)));
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);
  useEffect(() => { if (selectedDeckKey && !selectedDeck) setSelectedDeckKey(null); }, [selectedDeckKey, selectedDeck]);

  function handleTopBack() {
    if (selectedDeck) {
      setSelectedDeckKey(null);
      setSearchQuery("");
      setFilterOpen(false);
      setShowAll(false);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    router.push("/tools/board-prep");
  }

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

  return (
    <AppShell hideNav>
      <ToolPage title="Study all questions" eyebrow="Board Prep" icon={BookOpen} onBack={handleTopBack} backLabel={selectedDeck ? "Back to category decks" : "Back to Board Prep"}>
        <div className="space-y-4">
          {loading && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>Loading study decks...</Card>}
          {!loading && error && <Card className="p-5 text-center"><p className="font-bold" style={{ color: T.danger }}>{error}</p><button onClick={() => router.push("/tools/board-prep")} className="mt-4 rounded-2xl px-5 py-2 font-bold text-white" style={{ backgroundColor: T.navy }}>Back to Board Prep</button></Card>}
          {!loading && !error && questions.length === 0 && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>No questions available yet.</Card>}

          {!loading && !error && questions.length > 0 && !selectedDeck && (
            <>
              <ScoreHero summary={allSummary} filteredCount={questions.length} totalCount={questions.length} title="Overall study score" subtitle="all decks" />
              <AccuracyNotice />
              <RequestPanel />
              <DeckSelection decks={decks} deckQuery={deckQuery} setDeckQuery={setDeckQuery} onSelect={selectDeck} />
            </>
          )}

          {!loading && !error && questions.length > 0 && selectedDeck && (
            <>
              <ScoreHero summary={selectedSummary} filteredCount={filteredQuestions.length} totalCount={deckQuestions.length} title={`${selectedDeck.label} deck`} subtitle="draft saved" />
              <SelectedDeckHeading deck={selectedDeck} />
              <div className="sticky top-0 z-20 -mx-1 rounded-b-[1.5rem] px-1 pb-2 pt-1" style={{ backgroundColor: T.bg }}>
                <StudyControls searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterOpen={filterOpen} setFilterOpen={setFilterOpen} statusFilter={statusFilter} setStatusFilter={setStatusFilter} showAll={showAll} setShowAll={setShowAll} resetScores={resetScores} />
              </div>
              <RequestPanel />
              {filteredQuestions.length === 0 && <Card className="p-6 text-center text-sm" style={{ color: T.textMuted }}>No questions match your search or filter in this deck.</Card>}
              <div className="space-y-4 pb-8">
                {filteredQuestions.map((question, index) => <FlashCard key={question.id} question={question} index={index} showAll={showAll} score={scores[question.id]} onScore={handleScore} />)}
              </div>
            </>
          )}
        </div>
      </ToolPage>
    </AppShell>
  );
}
