"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle,
  ChevronRight,
  Flame,
  Home,
  Music,
  RotateCcw,
  ScrollText,
  Send,
  Shield,
  Trophy,
  XCircle,
} from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import ToolPage from "@/components/ui/ToolPage";

const OPTION_KEYS = ["a", "b", "c", "d"];
const OPTION_LABELS = { a: "A", b: "B", c: "C", d: "D" };
const TOTAL = 5;

const SCORE_MESSAGE = {
  5: "Perfect score. You are board-ready.",
  4: "Strong performance. Keep it up.",
  3: "Solid effort. Review what you missed.",
  2: "Keep studying — you will get there.",
  1: "Every expert was once a beginner.",
  0: "Use the explanations to guide your study.",
};

const REFERENCE_CARDS = [
  {
    title: "Soldier's Creed",
    icon: Shield,
    note: "Practice this aloud. Boards look for confidence, bearing, and understanding of the Warrior Ethos.",
    lines: [
      "I am an American Soldier.",
      "I am a warrior and a member of a team.",
      "I serve the people of the United States and live the Army Values.",
      "Warrior Ethos: mission first, never accept defeat, never quit, never leave a fallen comrade.",
      "Key meaning: disciplined, trained, professional, ready, and committed to the team.",
    ],
  },
  {
    title: "NCO Creed",
    icon: ScrollText,
    note: "Study the full creed from your board packet. The app highlights the lines most often asked in boards.",
    lines: [
      "Opening: No one is more professional than I.",
      "Identity: I am a noncommissioned officer, a leader of Soldiers.",
      "Known as: The Backbone of the Army.",
      "Watchword: Competence is my watchword.",
      "Two responsibilities: mission accomplishment and welfare of Soldiers.",
      "Closing idea: professionals, noncommissioned officers, leaders.",
    ],
  },
  {
    title: "Army Song",
    icon: Music,
    note: "Official title: The Army Goes Rolling Along. Use your official board packet for exact lyrics.",
    lines: [
      "Know the official title: The Army Goes Rolling Along.",
      "Know it is the official song of the U.S. Army.",
      "Study the intro, verse, and refrain.",
      "Board tip: practice singing or reciting it out loud with confidence.",
    ],
  },
  {
    title: "General Orders",
    icon: BookOpen,
    note: "Common board topic for customs, courtesies, and guard duty basics.",
    lines: [
      "1. Guard everything within the limits of my post and quit my post only when properly relieved.",
      "2. Obey my special orders and perform all duties in a military manner.",
      "3. Report violations, emergencies, and anything not covered in my instructions to the commander of the relief.",
    ],
  },
  {
    title: "High-change topics",
    icon: Trophy,
    note: "These are the areas most likely to confuse Soldiers using old study guides.",
    lines: [
      "AFT replaced ACFT for current Army fitness board prep.",
      "FM 7-22 is Holistic Health and Fitness, not just old PRT.",
      "AR 670-1 grooming and appearance standards were updated by Army Directive 2025-18.",
      "FM 6-27 replaced FM 27-10 for the law of land warfare.",
    ],
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

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border p-5 ${className}`} style={{ backgroundColor: T.card, borderColor: T.border }}>
      {children}
    </div>
  );
}

function Pill({ children, tone = "blue" }) {
  const bg = tone === "red" ? T.redBg : tone === "gold" ? T.goldBg : T.blueSoft;
  const color = tone === "red" ? T.brandRed : tone === "gold" ? T.gold : T.blue;
  return <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: bg, color }}>{children}</span>;
}

function StreakBadge({ streak }) {
  if (!streak) return null;
  return <Pill tone="gold"><span className="inline-flex items-center gap-1"><Flame size={14} />{streak}-day streak</span></Pill>;
}

function ReferenceCards() {
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-white to-slate-50">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
            <ScrollText size={22} />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold" style={{ color: T.navy }}>Creeds, song, and orders</h2>
            <p className="text-sm mt-1" style={{ color: T.textMuted }}>Use this section for quick memorization before board practice. This is an unofficial study aid; verify exact wording with your board packet.</p>
          </div>
        </div>
      </Card>
      {REFERENCE_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
                <Icon size={21} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-serif font-bold" style={{ color: T.navy }}>{card.title}</h3>
                <p className="text-sm mt-1" style={{ color: T.textMuted }}>{card.note}</p>
                <div className="mt-3 space-y-2">
                  {card.lines.map((line) => (
                    <div key={line} className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: T.borderSoft, color: T.text, backgroundColor: T.surface }}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function RequestCard({ currentQuestion }) {
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState("add");
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
    <Card className="mt-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <div>
          <p className="font-semibold" style={{ color: T.navy }}>Request a question change</p>
          <p className="text-xs" style={{ color: T.textMuted }}>Ask admin to add, update, or remove Board Prep content.</p>
        </div>
        <Send size={18} style={{ color: T.brandRed }} />
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {["add", "update", "remove"].map((type) => (
              <button key={type} onClick={() => setRequestType(type)} className="h-10 rounded-xl text-sm font-semibold capitalize" style={{ backgroundColor: requestType === type ? T.navy : T.surface, color: requestType === type ? "#fff" : T.textMuted, border: `1px solid ${T.border}` }}>{type}</button>
            ))}
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full rounded-xl border p-3 text-sm outline-none" style={{ borderColor: T.border, color: T.text }} placeholder="Explain what should be added, updated, or removed." />
          <button onClick={submitRequest} disabled={sending || !message.trim()} className="w-full h-11 rounded-xl font-semibold text-white disabled:opacity-40" style={{ backgroundColor: T.brandRed }}>{sending ? "Sending..." : "Send request"}</button>
        </div>
      )}
      {status && <p className="mt-3 text-xs" style={{ color: status.includes("sent") ? T.success : T.danger }}>{status}</p>}
    </Card>
  );
}

function IntroPhase({ streak, questions, onStart }) {
  const categories = [...new Set(questions.map((q) => q.category).filter(Boolean))];
  return (
    <Card>
      <div className="text-center py-4">
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: T.redBg }}><BookOpen size={30} style={{ color: T.brandRed }} /></div>
        <h2 className="mt-4 text-2xl font-serif font-bold" style={{ color: T.navy }}>Daily Board Prep</h2>
        <p className="text-sm mt-1" style={{ color: T.textMuted }}>{TOTAL} shuffled questions per day. Build streaks, score, and board confidence.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <StreakBadge streak={streak} />
          {categories.slice(0, 4).map((c) => <Pill key={c}>{c}</Pill>)}
        </div>
        <button onClick={onStart} className="mt-5 w-full h-12 rounded-xl font-semibold text-white" style={{ backgroundColor: T.brandRed }}>Start today's questions</button>
      </div>
    </Card>
  );
}

function QuestionPhase({ question, questionIndex, selected, result, submitting, onSelect, onSubmit, onNext }) {
  const answered = Boolean(result);
  return (
    <>
      <Card>
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: T.textMuted }}>Question {questionIndex + 1} of {TOTAL}</span>
          <Pill>{question.category}</Pill>
        </div>
        {question.source_publication && <p className="text-xs mb-2" style={{ color: T.textSubtle }}>{question.source_publication}</p>}
        <p className="text-lg font-semibold leading-snug mb-5" style={{ color: T.text }}>{question.question}</p>
        <div className="space-y-2.5 mb-5">
          {OPTION_KEYS.map((key) => {
            const isCorrect = result && key === result.correct_option;
            const isWrong = result && key === selected && !result.correct;
            const active = !result && key === selected;
            return (
              <button key={key} onClick={() => !answered && onSelect(key)} disabled={answered} className="w-full rounded-xl border px-4 py-3 text-left flex gap-3 items-start" style={{ borderColor: isCorrect ? T.success : isWrong ? T.danger : active ? T.blue : T.border, backgroundColor: isCorrect ? T.successBg : isWrong ? T.dangerBg : active ? T.blueSoft : T.card }}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: active ? T.blue : T.surface, color: active ? "#fff" : T.textMuted }}>{OPTION_LABELS[key]}</span>
                <span className="text-sm" style={{ color: isCorrect ? T.success : isWrong ? T.danger : T.text }}>{getOptionText(question, key)}</span>
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="rounded-xl border p-4 mb-5" style={{ backgroundColor: result.correct ? T.successBg : T.dangerBg, borderColor: result.correct ? T.success : T.danger }}>
            <div className="flex items-center gap-2 font-semibold" style={{ color: result.correct ? T.success : T.danger }}>{result.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}{result.correct ? "Correct" : "Not quite"}</div>
            {result.explanation && <p className="text-sm mt-1" style={{ color: T.text }}>{result.explanation}</p>}
          </div>
        )}
        {!answered ? (
          <button onClick={onSubmit} disabled={!selected || submitting} className="w-full h-11 rounded-xl font-semibold text-white disabled:opacity-40" style={{ backgroundColor: T.brandRed }}>{submitting ? "Checking..." : "Submit answer"}</button>
        ) : (
          <button onClick={onNext} className="w-full h-11 rounded-xl font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: T.navy }}>{questionIndex + 1 < TOTAL ? <>Next <ChevronRight size={16} /></> : <>See results <Trophy size={16} /></>}</button>
        )}
      </Card>
      <RequestCard currentQuestion={question} />
    </>
  );
}

function DonePhase({ score, streak, onReturnHome }) {
  const msg = SCORE_MESSAGE[score] || SCORE_MESSAGE[0];
  return (
    <Card>
      <div className="text-center py-3">
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center border-4" style={{ borderColor: score >= 4 ? T.success : score >= 2 ? T.amber : T.danger, backgroundColor: score >= 4 ? T.successBg : score >= 2 ? T.amberBg : T.dangerBg }}>
          <span className="text-2xl font-serif font-bold" style={{ color: score >= 4 ? T.success : score >= 2 ? T.amber : T.danger }}>{score}/{TOTAL}</span>
        </div>
        <h2 className="mt-4 text-xl font-serif font-bold" style={{ color: T.navy }}>Session complete</h2>
        <p className="text-sm mt-1" style={{ color: T.textMuted }}>{msg}</p>
        <div className="mt-4 flex justify-center"><StreakBadge streak={streak} /></div>
        <p className="text-xs mt-4" style={{ color: T.textSubtle }}>Come back tomorrow to keep your streak alive.</p>
        <button onClick={onReturnHome} className="mt-5 w-full h-11 rounded-xl font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: T.navy }}><Home size={16} />Back to Feed</button>
      </div>
    </Card>
  );
}

export default function BoardPrepPage() {
  const router = useRouter();
  const [tab, setTab] = useState("quiz");
  const [phase, setPhase] = useState("loading");
  const [data, setData] = useState(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const session = data?.session;
  const questions = data?.questions || [];
  const streak = data?.streak || 0;
  const currentQuestion = questions[questionIdx] || null;

  const fetchDaily = useCallback(async () => {
    setPhase("loading");
    setError(null);
    const token = await getAccessToken();
    if (!token) { setPhase("auth"); return; }
    const res = await fetch("/api/board-prep/daily", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error || "Could not load Board Prep."); setPhase("error"); return; }
    setData(json);
    const answeredCount = Object.keys(json.session?.answers || {}).length;
    if (json.session?.completed) setPhase("done");
    else if (answeredCount === 0) setPhase("intro");
    else { setQuestionIdx(answeredCount); setPhase("question"); }
  }, []);

  useEffect(() => { fetchDaily(); }, [fetchDaily]);

  async function handleSubmit() {
    if (!selected || !currentQuestion || !session) return;
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
    if (nextIdx >= TOTAL) { fetchDaily().then(() => setPhase("done")); return; }
    setQuestionIdx(nextIdx);
    setSelected(null);
    setResult(null);
  }

  return (
    <AppShell hideNav>
      <ToolPage title="Board Prep" eyebrow="Soldier Tools" icon={BookOpen}>
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border p-1" style={{ backgroundColor: T.surface, borderColor: T.border }}>
          <button onClick={() => setTab("quiz")} className="h-11 rounded-xl font-semibold" style={{ backgroundColor: tab === "quiz" ? T.card : "transparent", color: tab === "quiz" ? T.navy : T.textMuted }}>Daily Quiz</button>
          <button onClick={() => setTab("study")} className="h-11 rounded-xl font-semibold" style={{ backgroundColor: tab === "study" ? T.card : "transparent", color: tab === "study" ? T.navy : T.textMuted }}>Creeds & Orders</button>
        </div>

        {tab === "study" && <ReferenceCards />}

        {tab === "quiz" && phase === "loading" && <div className="py-16 text-center text-sm" style={{ color: T.textMuted }}>Loading today's questions...</div>}
        {tab === "quiz" && phase === "auth" && <Card><div className="text-center py-6"><p className="font-semibold" style={{ color: T.navy }}>Sign in to use Board Prep</p><p className="text-sm mt-1" style={{ color: T.textMuted }}>Track your score and streak.</p><button onClick={() => router.push("/")} className="mt-5 h-10 px-6 rounded-xl font-semibold text-white" style={{ backgroundColor: T.brandRed }}>Back to Feed</button></div></Card>}
        {tab === "quiz" && phase === "error" && <Card><div className="text-center py-6"><p className="font-semibold" style={{ color: T.danger }}>Something went wrong</p><p className="text-sm mt-1" style={{ color: T.textMuted }}>{error}</p><button onClick={fetchDaily} className="mt-5 inline-flex items-center gap-2 h-10 px-6 rounded-xl font-semibold text-white" style={{ backgroundColor: T.navy }}><RotateCcw size={15} />Retry</button></div></Card>}
        {tab === "quiz" && phase === "intro" && <IntroPhase streak={streak} questions={questions} onStart={() => { setQuestionIdx(0); setSelected(null); setResult(null); setPhase("question"); }} />}
        {tab === "quiz" && phase === "question" && currentQuestion && <QuestionPhase question={currentQuestion} questionIndex={questionIdx} selected={selected} result={result} submitting={submitting} onSelect={setSelected} onSubmit={handleSubmit} onNext={handleNext} />}
        {tab === "quiz" && phase === "done" && session && <DonePhase score={session.score ?? 0} streak={streak} onReturnHome={() => router.push("/")} />}
      </ToolPage>
    </AppShell>
  );
}
