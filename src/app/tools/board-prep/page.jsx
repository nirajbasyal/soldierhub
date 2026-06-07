"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Flame,
  RotateCcw,
  Send,
  Shield,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import ToolPage from "@/components/ui/ToolPage";

const OPTION_KEYS = ["a", "b", "c", "d"];
const OPTION_LABELS = { a: "A", b: "B", c: "C", d: "D" };
const TOTAL = 5;

const SCORE_MESSAGE = {
  5: "Perfect score. Board-ready energy.",
  4: "Strong work. Keep your streak alive.",
  3: "Solid reps. Review the explanation and come back tomorrow.",
  2: "Good start. The streak matters more than one score.",
  1: "One rep is still progress. Keep building.",
  0: "No problem. Read the explanations and keep practicing.",
};

const MEMORY_ITEMS = [
  {
    title: "Soldier's Creed",
    summary: "Opening, Warrior Ethos, Army Values, readiness.",
    body: "Study the full Soldier's Creed from your board packet. Know the opening, the Warrior Ethos, Army Values, readiness, professionalism, and the final line.",
  },
  {
    title: "NCO Creed",
    summary: "Professionalism, competence, mission, Soldiers.",
    body: "Study the full Creed of the Noncommissioned Officer. Know the opening, the watchword, the two basic responsibilities, and the closing identity of NCOs as professionals and leaders.",
  },
  {
    title: "Army Song",
    summary: "Official title and confidence cue.",
    body: "Official title: The Army Goes Rolling Along. Practice the intro, verse, and refrain from your official board packet so you can recite or sing it confidently if asked.",
  },
  {
    title: "General Orders",
    summary: "Three common board questions.",
    body: "1. Guard everything within the limits of my post and quit my post only when properly relieved.\n\n2. Obey my special orders and perform all my duties in a military manner.\n\n3. Report violations of my special orders, emergencies, and anything not covered in my instructions to the commander of the relief.",
  },
];

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function getOptionText(q, key) {
  return q?.[`option_${key}`] || "";
}

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-[1.75rem] border shadow-sm ${className}`}
      style={{ backgroundColor: T.card, borderColor: T.border, ...style }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone = "blue" }) {
  const bg = tone === "red" ? T.redBg : tone === "gold" ? T.goldBg : tone === "green" ? T.successBg : T.blueSoft;
  const color = tone === "red" ? T.brandRed : tone === "gold" ? T.gold : tone === "green" ? T.success : T.blue;
  return <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: bg, color }}>{children}</span>;
}

function StreakBadge({ streak }) {
  return (
    <div className="rounded-2xl border px-3 py-2 text-center" style={{ borderColor: T.border, backgroundColor: T.goldBg }}>
      <div className="flex items-center justify-center gap-1 font-serif text-xl font-bold" style={{ color: T.gold }}>
        <Flame size={18} />{streak || 0}
      </div>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: T.textMuted }}>Day streak</p>
    </div>
  );
}

function ProgressDots({ filled = 0, total = TOTAL }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, idx) => (
        <div key={idx} className="h-2 flex-1 rounded-full" style={{ backgroundColor: idx < filled ? T.brandRed : T.borderSoft }} />
      ))}
    </div>
  );
}

function MemoryPanel() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const activeItem = MEMORY_ITEMS.find((item) => item.title === active);

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 p-3 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
            <Shield size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold leading-tight" style={{ color: T.navy }}>Quick memory guide</p>
            <p className="mt-0.5 text-xs leading-5" style={{ color: T.textMuted }}>Creeds, Army Song, and General Orders.</p>
          </div>
        </div>
        <ChevronDown size={18} className={open ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} style={{ color: T.textMuted }} />
      </button>

      {open && (
        <div className="border-t p-3" style={{ borderColor: T.borderSoft }}>
          <div className="grid grid-cols-2 gap-2">
            {MEMORY_ITEMS.map((item) => {
              const selected = active === item.title;
              return (
                <button
                  key={item.title}
                  onClick={() => setActive(selected ? null : item.title)}
                  className="rounded-2xl border p-3 text-left transition active:scale-[0.99]"
                  style={{ borderColor: selected ? T.brandRed : T.borderSoft, backgroundColor: T.card }}
                >
                  <p className="text-sm font-bold leading-tight" style={{ color: T.navy }}>{item.title}</p>
                  <p className="mt-1 text-[11px] leading-4" style={{ color: T.textMuted }}>{item.summary}</p>
                </button>
              );
            })}
          </div>

          {activeItem && (
            <div className="mt-3 rounded-2xl border p-4" style={{ borderColor: T.borderSoft, backgroundColor: T.card }}>
              <p className="text-sm font-bold" style={{ color: T.navy }}>{activeItem.title}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-7" style={{ color: T.text }}>{activeItem.body}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function RequestCard({ currentQuestion }) {
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState("update");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  async function submitRequest() {
    setSending(true);
    setStatus(null);
    const token = await getAccessToken();
    const res = await fetch("/api/board-prep/request", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        request_type: requestType,
        question_id: requestType === "add" ? null : currentQuestion?.id,
        category: currentQuestion?.category || null,
        message,
        suggested_question: requestType === "add" ? message : null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setStatus(json.error || "Could not send request.");
      return;
    }
    setMessage("");
    setOpen(false);
    setStatus("Request sent to admin.");
  }

  return (
    <div className="mt-4">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold" style={{ borderColor: T.border, color: T.textMuted, backgroundColor: T.card }}>
        <Send size={14} /> Request question fix
      </button>
      {open && (
        <Card className="mt-3 p-4">
          <p className="font-semibold" style={{ color: T.navy }}>Send admin a correction</p>
          <p className="mt-1 text-xs" style={{ color: T.textMuted }}>Use this for wrong answers, outdated questions, or a new question idea.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["add", "update", "remove"].map((type) => (
              <button key={type} onClick={() => setRequestType(type)} className="h-10 rounded-xl text-sm font-semibold capitalize" style={{ backgroundColor: requestType === type ? T.navy : T.surface, color: requestType === type ? "#fff" : T.textMuted, border: `1px solid ${T.border}` }}>{type}</button>
            ))}
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-3 w-full rounded-xl border p-3 text-sm outline-none" style={{ borderColor: T.border, color: T.text }} placeholder="Explain what should change." />
          <button onClick={submitRequest} disabled={sending || !message.trim()} className="mt-3 h-11 w-full rounded-xl font-semibold text-white disabled:opacity-40" style={{ backgroundColor: T.brandRed }}>{sending ? "Sending..." : "Send request"}</button>
        </Card>
      )}
      {status && <p className="mt-2 text-xs" style={{ color: status.includes("sent") ? T.success : T.danger }}>{status}</p>}
    </div>
  );
}

function Hero({ streak, answeredCount = 0, practice = false }) {
  return (
    <Card className="overflow-hidden p-4" style={{ background: `linear-gradient(135deg, ${T.navy}, #163b63)`, borderColor: "rgba(255,255,255,0.12)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{practice ? "Practice redo" : "Daily board quiz"}</p>
          <h1 className="mt-1.5 font-serif text-2xl font-black leading-tight text-white">{practice ? "Practice again" : "5 questions. One streak."}</h1>
          <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/75">
            {practice ? "Redo for memory. Streak unchanged." : "Answer today's shuffled board questions. Score, learn, come back tomorrow."}
          </p>
        </div>
        <StreakBadge streak={streak} />
      </div>
      <div className="mt-4 rounded-2xl bg-white/10 p-2.5">
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-white/80">
          <span>{answeredCount}/{TOTAL} answered</span>
          <span>{practice ? "Memory reps" : "Daily goal"}</span>
        </div>
        <ProgressDots filled={answeredCount} />
      </div>
    </Card>
  );
}

function IntroPhase({ streak, questions, onStart, onStudy }) {
  const categories = [...new Set(questions.map((q) => q.category).filter(Boolean))];
  return (
    <div className="space-y-4">
      <MemoryPanel />
      <Hero streak={streak} answeredCount={0} />
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
            <Target size={23} />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold" style={{ color: T.navy }}>Today's mission</h2>
            <p className="mt-1 text-sm leading-6" style={{ color: T.textMuted }}>Complete 5 board questions. The app tracks your score and streak automatically.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill tone="red">5 questions</Pill>
          <Pill tone="gold">Streak tracking</Pill>
          {categories.slice(0, 3).map((c) => <Pill key={c}>{c}</Pill>)}
        </div>
        <button onClick={onStart} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-bold text-white" style={{ backgroundColor: T.brandRed }}>
          Start quiz <ChevronRight size={18} />
        </button>
        <button onClick={onStudy} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border font-bold" style={{ borderColor: T.border, color: T.navy, backgroundColor: T.card }}>
          <BookOpen size={17} /> Study all questions
        </button>
      </Card>
    </div>
  );
}

function QuestionPhase({ question, questionIndex, selected, result, submitting, streak, practice, onSelect, onSubmit, onNext }) {
  const answered = Boolean(result);
  const answeredCount = questionIndex + (answered ? 1 : 0);

  return (
    <div className="space-y-4">
      <Hero streak={streak} answeredCount={answeredCount} practice={practice} />
      <Card className="p-5">
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-bold" style={{ color: T.textMuted }}>Question {questionIndex + 1} of {TOTAL}</span>
            <Pill tone={practice ? "gold" : "blue"}>{practice ? "Practice" : question.category}</Pill>
          </div>
          <ProgressDots filled={answeredCount} />
        </div>
        {question.source_publication && <p className="text-xs mb-2 font-semibold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>{question.source_publication}</p>}
        <p className="mb-5 text-xl font-black leading-snug" style={{ color: T.navy }}>{question.question}</p>
        <div className="space-y-2.5 mb-5">
          {OPTION_KEYS.map((key) => {
            const isCorrect = result && key === result.correct_option;
            const isWrong = result && key === selected && !result.correct;
            const active = !result && key === selected;
            return (
              <button key={key} onClick={() => !answered && onSelect(key)} disabled={answered} className="w-full rounded-2xl border px-4 py-3 text-left flex gap-3 items-start transition active:scale-[0.99]" style={{ borderColor: isCorrect ? T.success : isWrong ? T.danger : active ? T.brandRed : T.border, backgroundColor: isCorrect ? T.successBg : isWrong ? T.dangerBg : active ? T.redBg : T.card }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black" style={{ backgroundColor: isCorrect ? T.success : isWrong ? T.danger : active ? T.brandRed : T.surface, color: active || isCorrect || isWrong ? "#fff" : T.textMuted }}>{OPTION_LABELS[key]}</span>
                <span className="text-sm font-semibold leading-6" style={{ color: isCorrect ? T.success : isWrong ? T.danger : T.text }}>{getOptionText(question, key)}</span>
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="rounded-2xl border p-4 mb-5" style={{ backgroundColor: result.correct ? T.successBg : T.dangerBg, borderColor: result.correct ? T.success : T.danger }}>
            <div className="flex items-center gap-2 font-bold" style={{ color: result.correct ? T.success : T.danger }}>{result.correct ? <CheckCircle size={17} /> : <XCircle size={17} />}{result.correct ? "Correct" : "Not quite"}</div>
            {result.explanation && <p className="text-sm mt-1 leading-6" style={{ color: T.text }}>{result.explanation}</p>}
          </div>
        )}
        {!answered ? (
          <button onClick={onSubmit} disabled={!selected || submitting} className="w-full h-12 rounded-2xl font-bold text-white disabled:opacity-40" style={{ backgroundColor: T.brandRed }}>{submitting ? "Checking..." : practice ? "Check practice answer" : "Submit answer"}</button>
        ) : (
          <button onClick={onNext} className="w-full h-12 rounded-2xl font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: T.navy }}>{questionIndex + 1 < TOTAL ? <>Next question <ChevronRight size={16} /></> : <>See score <Trophy size={16} /></>}</button>
        )}
      </Card>
      <RequestCard currentQuestion={question} />
    </div>
  );
}

function DonePhase({ score, streak, practice, onRefresh, onRedo, onStudy }) {
  const msg = SCORE_MESSAGE[score] || SCORE_MESSAGE[0];
  return (
    <div className="space-y-4">
      <MemoryPanel />
      <Card className="p-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4" style={{ borderColor: score >= 4 ? T.success : score >= 2 ? T.amber : T.danger, backgroundColor: score >= 4 ? T.successBg : score >= 2 ? T.amberBg : T.dangerBg }}>
          <span className="font-serif text-3xl font-black" style={{ color: score >= 4 ? T.success : score >= 2 ? T.amber : T.danger }}>{score}/{TOTAL}</span>
        </div>
        <h2 className="mt-4 text-2xl font-serif font-black" style={{ color: T.navy }}>{practice ? "Practice quiz complete" : "Daily quiz complete"}</h2>
        <p className="text-sm mt-1 leading-6" style={{ color: T.textMuted }}>{practice ? "Practice does not change your daily streak." : msg}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border p-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
            <div className="flex justify-center" style={{ color: T.brandRed }}><Award size={20} /></div>
            <p className="mt-1 text-xl font-black" style={{ color: T.navy }}>{score}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: T.textMuted }}>Score</p>
          </div>
          <StreakBadge streak={streak} />
        </div>
        <p className="mt-4 text-xs" style={{ color: T.textSubtle }}>{practice ? "Redo again anytime for memorization." : "Come back tomorrow for a new streak-counting set of 5 questions."}</p>
        <button onClick={onRefresh} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border font-bold" style={{ borderColor: T.border, color: T.navy, backgroundColor: T.card }}><RotateCcw size={15} />Refresh status</button>
        <button onClick={onRedo} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl font-bold text-white" style={{ backgroundColor: T.navy }}><RotateCcw size={15} />Redo practice quiz</button>
        <button onClick={onStudy} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border font-bold" style={{ borderColor: T.border, color: T.navy, backgroundColor: T.card }}><BookOpen size={16} />Study all questions</button>
      </Card>
    </div>
  );
}

export default function BoardPrepPage() {
  const router = useRouter();
  const { setMobileMenu } = useApp();
  const [phase, setPhase] = useState("loading");
  const [data, setData] = useState(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceScore, setPracticeScore] = useState(0);

  const session = data?.session;
  const questions = data?.questions || [];
  const streak = data?.streak || 0;
  const currentQuestion = questions[questionIdx] || null;

  const fetchDaily = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setPracticeMode(false);
    setPracticeScore(0);
    const token = await getAccessToken();
    if (!token) { setPhase("auth"); return; }
    const res = await fetch("/api/board-prep/daily", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error || "Could not load Board Prep."); setPhase("error"); return; }
    setData(json);
    const answeredCount = Object.keys(json.session?.answers || {}).length;
    setSelected(null);
    setResult(null);
    if (json.session?.completed) setPhase("done");
    else if (answeredCount === 0) setPhase("intro");
    else { setQuestionIdx(answeredCount); setPhase("question"); }
  }, []);

  const startPracticeRedo = useCallback(async () => {
    setPhase("loading");
    setError(null);
    const token = await getAccessToken();
    if (!token) { setPhase("auth"); return; }
    const res = await fetch("/api/board-prep/questions?limit=5&shuffle=1", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.data?.length) { setError(json.error || "Could not load practice questions."); setPhase("error"); return; }
    setData((prev) => ({ ...(prev || {}), questions: json.data.slice(0, TOTAL) }));
    setPracticeMode(true);
    setPracticeScore(0);
    setQuestionIdx(0);
    setSelected(null);
    setResult(null);
    setPhase("question");
  }, []);

  useEffect(() => { fetchDaily(); }, [fetchDaily]);

  async function handleSubmit() {
    if (!selected || !currentQuestion) return;

    if (practiceMode) {
      const correct = selected === currentQuestion.correct_option;
      setResult({ correct, correct_option: currentQuestion.correct_option, explanation: currentQuestion.explanation });
      if (correct) setPracticeScore((score) => score + 1);
      return;
    }

    if (!session) return;
    setSubmitting(true);
    const token = await getAccessToken();
    const res = await fetch("/api/board-prep/answer", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.id, question_id: currentQuestion.id, selected_option: selected }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) { setError(json.error || "Could not submit answer."); return; }
    setResult({ correct: json.correct, correct_option: json.correct_option, explanation: json.explanation });
    setData((prev) => ({ ...prev, session: json.session }));
  }

  function handleNext() {
    const nextIdx = questionIdx + 1;
    if (nextIdx >= TOTAL) {
      if (practiceMode) setPhase("done");
      else fetchDaily().then(() => setPhase("done"));
      return;
    }
    setQuestionIdx(nextIdx);
    setSelected(null);
    setResult(null);
  }

  return (
    <AppShell hideNav>
      <ToolPage
        title="Board Prep"
        eyebrow="Soldier Tools"
        icon={BookOpen}
        onBack={() => setMobileMenu(true)}
        backLabel="Open menu"
      >
        {phase === "loading" && <div className="py-16 text-center text-sm" style={{ color: T.textMuted }}>Loading Board Prep...</div>}
        {phase === "auth" && <Card className="p-5"><div className="text-center py-6"><p className="font-semibold" style={{ color: T.navy }}>Sign in to use Board Prep</p><p className="text-sm mt-1" style={{ color: T.textMuted }}>Track your daily score and streak.</p><button onClick={() => router.push("/")} className="mt-5 h-10 px-6 rounded-xl font-semibold text-white" style={{ backgroundColor: T.brandRed }}>Back to Feed</button></div></Card>}
        {phase === "error" && <Card className="p-5"><div className="text-center py-6"><p className="font-semibold" style={{ color: T.danger }}>Something went wrong</p><p className="text-sm mt-1" style={{ color: T.textMuted }}>{error}</p><button onClick={fetchDaily} className="mt-5 inline-flex items-center gap-2 h-10 px-6 rounded-xl font-semibold text-white" style={{ backgroundColor: T.navy }}><RotateCcw size={15} />Retry</button></div></Card>}
        {phase === "intro" && <IntroPhase streak={streak} questions={questions} onStart={() => { setQuestionIdx(0); setSelected(null); setResult(null); setPracticeMode(false); setPhase("question"); }} onStudy={() => router.push("/tools/board-prep/study")} />}
        {phase === "question" && currentQuestion && <QuestionPhase question={currentQuestion} questionIndex={questionIdx} selected={selected} result={result} submitting={submitting} streak={streak} practice={practiceMode} onSelect={setSelected} onSubmit={handleSubmit} onNext={handleNext} />}
        {phase === "done" && <DonePhase score={practiceMode ? practiceScore : (session?.score ?? 0)} streak={streak} practice={practiceMode} onRefresh={fetchDaily} onRedo={startPracticeRedo} onStudy={() => router.push("/tools/board-prep/study")} />}
      </ToolPage>
    </AppShell>
  );
}
