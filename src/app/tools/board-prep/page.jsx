"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Flame,
  RotateCcw,
  Send,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import ToolPage from "@/components/ui/ToolPage";
import QuickMemoryGuide from "@/components/board-prep/QuickMemoryGuide";

const OPTION_KEYS = ["a", "b", "c", "d"];
const OPTION_LABELS = { a: "A", b: "B", c: "C", d: "D" };
const DAILY_TARGET = 5;
const FLASHCARD_MARKER = "__FLASHCARD__";

const SCORE_MESSAGE = {
  5: "Perfect score. Board-ready energy.",
  4: "Strong work. Keep your streak alive.",
  3: "Solid reps. Keep building confidence.",
  2: "Good start. Review and come back tomorrow.",
  1: "One point is still progress.",
  0: "No problem. Study the answers and keep practicing.",
  "-1": "Some flashcards need review. That is useful practice.",
  "-2": "Review the flashcards and try again for memory.",
  "-3": "Today exposed weak spots. That is exactly what practice is for.",
  "-4": "Review mode will help lock the answers in.",
  "-5": "This is a review day. Study the cards and try again.",
};

function authHeader(token) {
  return `${"Bear"}er ${token}`;
}

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function getOptionText(question, key) {
  return question?.[`option_${key}`] || "";
}

function isFlashcardQuestion(question) {
  return question?.question_type === "flashcard" || (
    question?.option_b === FLASHCARD_MARKER &&
    question?.option_c === FLASHCARD_MARKER &&
    question?.option_d === FLASHCARD_MARKER
  );
}

function getCorrectAnswerText(question) {
  return question?.correct_answer || getOptionText(question, question?.correct_option) || "Answer not available.";
}

function Card({ children, className = "", style = {} }) {
  return (
    <div className={`rounded-[1.75rem] border shadow-sm ${className}`} style={{ backgroundColor: T.card, borderColor: T.border, ...style }}>
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
    <div className="flex min-h-[86px] flex-col items-center justify-center rounded-2xl border px-4 py-3 text-center" style={{ borderColor: "rgba(179,25,66,0.22)", backgroundColor: T.redBg }}>
      <div className="flex items-center justify-center gap-1.5 font-serif text-2xl font-bold leading-none" style={{ color: T.brandRed }}>
        <Flame size={21} />
        <span>{streak || 0}</span>
      </div>
      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: T.textMuted }}>Day streak</p>
    </div>
  );
}

function ProgressDots({ filled = 0, total = DAILY_TARGET }) {
  const safeTotal = Math.max(total || DAILY_TARGET, 1);
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: safeTotal }).map((_, idx) => (
        <div key={idx} className="h-2 flex-1 rounded-full" style={{ backgroundColor: idx < filled ? T.brandRed : T.borderSoft }} />
      ))}
    </div>
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
      headers: { Authorization: authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ request_type: requestType, question_id: requestType === "add" ? null : currentQuestion?.id, category: currentQuestion?.category || null, message, suggested_question: requestType === "add" ? message : null }),
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
      <button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold" style={{ borderColor: T.border, color: T.textMuted, backgroundColor: T.card }}>
        <Send size={14} /> Request question fix
      </button>
      {open && (
        <Card className="mt-3 p-4">
          <p className="font-semibold" style={{ color: T.navy }}>Send admin a correction</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["add", "update", "remove"].map((type) => (
              <button key={type} onClick={() => setRequestType(type)} className="h-10 rounded-xl text-sm font-semibold capitalize" style={{ backgroundColor: requestType === type ? T.navy : T.surface, color: requestType === type ? "#fff" : T.textMuted, border: `1px solid ${T.border}` }}>
                {type}
              </button>
            ))}
          </div>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="mt-3 w-full rounded-xl border p-3 text-sm outline-none" style={{ borderColor: T.border, color: T.text }} placeholder="Explain what should change." />
          <button onClick={submitRequest} disabled={sending || !message.trim()} className="mt-3 h-11 w-full rounded-xl font-semibold text-white disabled:opacity-40" style={{ backgroundColor: T.brandRed }}>
            {sending ? "Sending..." : "Send request"}
          </button>
        </Card>
      )}
      {status && <p className="mt-2 text-xs" style={{ color: status.includes("sent") ? T.success : T.danger }}>{status}</p>}
    </div>
  );
}

function Hero({ streak, answeredCount = 0, practice = false, totalQuestions = DAILY_TARGET }) {
  return (
    <Card className="overflow-hidden p-4" style={{ background: `linear-gradient(135deg, ${T.navy}, #163b63)`, borderColor: "rgba(255,255,255,0.12)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{practice ? "Review quiz" : "Daily board quiz"}</p>
          <h1 className="mt-1.5 font-serif text-2xl font-black leading-tight text-white">{practice ? "Review again" : "Daily Board Prep"}</h1>
          {practice && <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/75">Practice for memory. Streak unchanged.</p>}
        </div>
        <StreakBadge streak={streak} />
      </div>
      <div className="mt-4 rounded-2xl bg-white/10 p-2.5">
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-white/80">
          <span>{answeredCount}/{totalQuestions} answered</span>
          <span>{practice ? "Review reps" : "Daily goal"}</span>
        </div>
        <ProgressDots filled={answeredCount} total={totalQuestions} />
      </div>
    </Card>
  );
}

function IntroPhase({ streak, questions, onStart, onStudy }) {
  const categories = [...new Set(questions.map((q) => q.category).filter(Boolean))];
  const flashcards = questions.filter(isFlashcardQuestion).length;
  const mcq = questions.length - flashcards;

  return (
    <div className="space-y-4">
      <QuickMemoryGuide />
      <Hero streak={streak} answeredCount={0} totalQuestions={questions.length || DAILY_TARGET} />
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
            <Target size={23} />
          </div>
          <h2 className="text-xl font-serif font-bold" style={{ color: T.navy }}>Today's mission</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill tone="red">{questions.length || DAILY_TARGET} questions</Pill>
          <Pill tone="gold">{flashcards} flashcard{flashcards === 1 ? "" : "s"}</Pill>
          <Pill>{mcq} multiple choice</Pill>
          {categories.slice(0, 2).map((category) => <Pill key={category}>{category}</Pill>)}
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

function ExhaustedPhase({ message, onRestart, onStudy, onBack }) {
  return (
    <div className="space-y-4">
      <QuickMemoryGuide />
      <Card className="p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl" style={{ backgroundColor: T.goldBg, color: T.gold }}>
          <Trophy size={30} />
        </div>
        <h2 className="mt-4 text-2xl font-serif font-black" style={{ color: T.navy }}>You finished all board questions</h2>
        <p className="mt-2 text-sm leading-6" style={{ color: T.textMuted }}>{message || "You have finished all available Board Prep questions. Restart the quiz to keep practicing and memorizing."}</p>
        <button onClick={onRestart} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-bold text-white" style={{ backgroundColor: T.brandRed }}>
          <RotateCcw size={16} /> Restart quiz
        </button>
        <button onClick={onStudy} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border font-bold" style={{ borderColor: T.border, color: T.navy, backgroundColor: T.card }}>
          <BookOpen size={17} /> Study all questions
        </button>
        <button onClick={onBack} className="mt-3 flex h-11 w-full items-center justify-center rounded-2xl border font-bold" style={{ borderColor: T.border, color: T.textMuted, backgroundColor: T.surface }}>
          Back to feed
        </button>
      </Card>
    </div>
  );
}

function QuestionPhase({ question, questionIndex, selected, result, submitting, streak, practice, isFlashcard, totalQuestions, onSelect, onSubmit, onNext }) {
  const [answerOpen, setAnswerOpen] = useState(false);
  const answered = Boolean(result);
  const answeredCount = questionIndex + (answered ? 1 : 0);
  const answerText = getCorrectAnswerText(question);
  useEffect(() => { setAnswerOpen(false); }, [question?.id, isFlashcard]);

  return (
    <div className="space-y-4">
      <Hero streak={streak} answeredCount={answeredCount} practice={practice} totalQuestions={totalQuestions} />
      <Card className="p-5">
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-bold" style={{ color: T.textMuted }}>Question {questionIndex + 1} of {totalQuestions}</span>
            <Pill tone={isFlashcard ? "gold" : practice ? "gold" : "blue"}>{isFlashcard ? "Flashcard" : practice ? "Practice" : "Multiple choice"}</Pill>
          </div>
          <ProgressDots filled={answeredCount} total={totalQuestions} />
        </div>
        {question.source_publication && <p className="text-xs mb-2 font-semibold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>{question.source_publication}</p>}
        <p className="mb-5 text-xl font-black leading-snug" style={{ color: T.navy }}>{question.question}</p>
        {isFlashcard ? (
          <div className="space-y-3">
            <button type="button" onClick={() => !answered && setAnswerOpen((value) => !value)} disabled={answered} className="w-full rounded-2xl border border-dashed p-4 text-left transition active:scale-[0.99] disabled:cursor-default" style={{ borderColor: answerOpen || answered ? "rgba(49,151,84,0.26)" : T.border, backgroundColor: answerOpen || answered ? "#F3FBF6" : T.surface }}>
              <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.textMuted }}>Correct answer</p>
              {answerOpen || answered ? <p className="mt-2 text-base font-black leading-6" style={{ color: T.success }}>{answerText}</p> : <p className="mt-2 text-sm font-bold" style={{ color: T.textMuted }}>**** tap or click to see the answer ****</p>}
            </button>
            {!answered ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onSubmit("known")} disabled={!answerOpen || submitting} className="flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-black disabled:opacity-45" style={{ borderColor: "rgba(49,151,84,0.32)", backgroundColor: "#F3FBF6", color: T.success }}><CheckCircle size={17} /> I knew it +1</button>
                <button type="button" onClick={() => onSubmit("review")} disabled={!answerOpen || submitting} className="flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-black disabled:opacity-45" style={{ borderColor: "rgba(185,28,28,0.30)", backgroundColor: T.dangerBg, color: T.danger }}><XCircle size={17} /> Need review -1</button>
              </div>
            ) : (
              <button onClick={onNext} className="w-full h-12 rounded-2xl font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: T.navy }}>{questionIndex + 1 < totalQuestions ? <>Next question <ChevronRight size={16} /></> : <>See score <Trophy size={16} /></>}</button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2.5 mb-5">
              {OPTION_KEYS.map((key) => {
                const isCorrect = result && key === result.correct_option;
                const isWrong = result && key === selected && !result.correct;
                const active = !result && key === selected;
                return <button key={key} onClick={() => !answered && onSelect(key)} disabled={answered} className="w-full rounded-2xl border px-4 py-3 text-left flex gap-3 items-start transition active:scale-[0.99]" style={{ borderColor: isCorrect ? T.success : isWrong ? T.danger : active ? T.brandRed : T.border, backgroundColor: isCorrect ? T.successBg : isWrong ? T.dangerBg : active ? T.redBg : T.card }}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black" style={{ backgroundColor: isCorrect ? T.success : isWrong ? T.danger : active ? T.brandRed : T.surface, color: active || isCorrect || isWrong ? "#fff" : T.textMuted }}>{OPTION_LABELS[key]}</span><span className="text-sm font-semibold leading-6" style={{ color: isCorrect ? T.success : isWrong ? T.danger : T.text }}>{getOptionText(question, key)}</span></button>;
              })}
            </div>
            {!answered ? <button onClick={() => onSubmit()} disabled={!selected || submitting} className="w-full h-12 rounded-2xl font-bold text-white disabled:opacity-40" style={{ backgroundColor: T.brandRed }}>{submitting ? "Checking..." : practice ? "Check practice answer" : "Submit answer"}</button> : <button onClick={onNext} className="w-full h-12 rounded-2xl font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: T.navy }}>{questionIndex + 1 < totalQuestions ? <>Next question <ChevronRight size={16} /></> : <>See score <Trophy size={16} /></>}</button>}
          </>
        )}
      </Card>
      <RequestCard currentQuestion={question} />
    </div>
  );
}

function DonePhase({ score, streak, practice, totalQuestions, onReview, onStudy }) {
  const msg = SCORE_MESSAGE[String(score)] || SCORE_MESSAGE[0];
  const toneColor = score >= 4 ? T.success : score >= 2 ? T.amber : T.danger;
  const toneBg = score >= 4 ? T.successBg : score >= 2 ? T.amberBg : T.dangerBg;
  return <div className="space-y-4"><QuickMemoryGuide /><Card className="p-6 text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4" style={{ borderColor: toneColor, backgroundColor: toneBg }}><span className="font-serif text-3xl font-black" style={{ color: toneColor }}>{score}/{totalQuestions || DAILY_TARGET}</span></div><h2 className="mt-4 text-2xl font-serif font-black" style={{ color: T.navy }}>{practice ? "Review quiz complete" : "Daily quiz complete"}</h2><p className="text-sm mt-1 leading-6" style={{ color: T.textMuted }}>{practice ? "Review practice does not change your daily streak." : msg}</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="flex min-h-[86px] flex-col items-center justify-center rounded-2xl border p-3" style={{ borderColor: T.border, backgroundColor: T.surface }}><div className="flex justify-center" style={{ color: T.brandRed }}><Award size={20} /></div><p className="mt-1 text-xl font-black" style={{ color: T.navy }}>{score}</p><p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: T.textMuted }}>Score</p></div><StreakBadge streak={streak} /></div><button onClick={onReview} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl font-bold text-white" style={{ backgroundColor: T.navy }}><RotateCcw size={15} />Review quiz</button><button onClick={onStudy} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border font-bold" style={{ borderColor: T.border, color: T.navy, backgroundColor: T.card }}><BookOpen size={16} />Study all questions</button></Card></div>;
}

export default function BoardPrepPage() {
  const router = useRouter();
  const [phase, setPhase] = useState("loading");
  const [data, setData] = useState(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [exhaustedMessage, setExhaustedMessage] = useState(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceScore, setPracticeScore] = useState(0);
  const session = data?.session;
  const questions = data?.questions || [];
  const totalQuestions = questions.length || DAILY_TARGET;
  const streak = data?.streak || 0;
  const currentQuestion = questions[questionIdx] || null;
  const currentIsFlashcard = useMemo(() => isFlashcardQuestion(currentQuestion), [currentQuestion]);
  const handleBack = useCallback(() => { router.push("/"); }, [router]);

  const fetchDaily = useCallback(async () => {
    setPhase("loading"); setError(null); setExhaustedMessage(null); setPracticeMode(false); setPracticeScore(0);
    const token = await getAccessToken();
    if (!token) { setPhase("auth"); return; }
    const res = await fetch("/api/board-prep/daily", { headers: { Authorization: authHeader(token) }, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error || "Could not load Board Prep."); setPhase("error"); return; }
    const nextQuestions = json.questions || [];
    const answeredCount = Object.keys(json.session?.answers || {}).length;
    setData(json); setSelected(null); setResult(null); setQuestionIdx(Math.min(answeredCount, Math.max(nextQuestions.length - 1, 0)));
    if (json.exhausted || (!json.session?.completed && nextQuestions.length === 0)) { setExhaustedMessage(json.message || "You finished all available Board Prep questions. Restart the quiz to keep practicing."); setPhase("exhausted"); return; }
    if (json.session?.completed) setPhase("done");
    else if (answeredCount === 0) setPhase("intro");
    else if (answeredCount >= nextQuestions.length) setPhase("exhausted");
    else setPhase("question");
  }, []);

  const startReviewQuiz = useCallback(async () => {
    setPhase("loading"); setError(null); setExhaustedMessage(null);
    const token = await getAccessToken();
    if (!token) { setPhase("auth"); return; }
    const res = await fetch("/api/board-prep/questions?limit=5&shuffle=1", { headers: { Authorization: authHeader(token) }, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error || "Could not restart the quiz."); setPhase("error"); return; }
    const reviewQuestions = (json.data || []).slice(0, DAILY_TARGET);
    if (!reviewQuestions.length) { setExhaustedMessage("No active Board Prep questions are available right now. Add or approve questions in the admin dashboard, then restart the quiz."); setData((prev) => ({ ...(prev || {}), questions: [] })); setPhase("exhausted"); return; }
    setData((prev) => ({ ...(prev || {}), questions: reviewQuestions })); setPracticeMode(true); setPracticeScore(0); setQuestionIdx(0); setSelected(null); setResult(null); setPhase("question");
  }, []);

  useEffect(() => { fetchDaily(); }, [fetchDaily]);

  async function handleSubmit(valueOverride) {
    if (!currentQuestion) { setPhase("exhausted"); return; }
    const answerMode = currentIsFlashcard ? "flashcard" : "multiple_choice";
    const answerValue = currentIsFlashcard ? valueOverride : selected;
    if (!answerValue) return;
    if (practiceMode) {
      if (currentIsFlashcard) { const points = answerValue === "known" ? 1 : -1; setResult({ correct: points > 0, points, answer_mode: answerMode, correct_option: currentQuestion.correct_option, explanation: currentQuestion.explanation }); setPracticeScore((score) => score + points); return; }
      const correct = answerValue === currentQuestion.correct_option; setResult({ correct, points: correct ? 1 : 0, answer_mode: answerMode, correct_option: currentQuestion.correct_option, explanation: currentQuestion.explanation }); if (correct) setPracticeScore((score) => score + 1); return;
    }
    if (!session) return;
    setSubmitting(true);
    const token = await getAccessToken();
    const res = await fetch("/api/board-prep/answer", { method: "POST", headers: { Authorization: authHeader(token), "Content-Type": "application/json" }, body: JSON.stringify({ session_id: session.id, question_id: currentQuestion.id, selected_option: answerValue, answer_mode: answerMode }) });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) { setError(json.error || "Could not submit answer."); return; }
    setResult({ correct: json.correct, points: json.points, answer_mode: json.answer_mode, correct_option: json.correct_option, explanation: json.explanation });
    setData((prev) => ({ ...prev, session: json.session }));
  }

  function handleNext() {
    const nextIdx = questionIdx + 1;
    if (nextIdx >= totalQuestions) { if (practiceMode) setPhase("done"); else fetchDaily(); return; }
    setQuestionIdx(nextIdx); setSelected(null); setResult(null);
  }

  return (
    <AppShell hideNav>
      <ToolPage title="Board Prep" eyebrow="Soldier Tools" icon={BookOpen} onBack={handleBack} backLabel="Back to feed">
        {phase === "loading" && <div className="py-16 text-center text-sm" style={{ color: T.textMuted }}>Loading Board Prep...</div>}
        {phase === "auth" && <Card className="p-5"><div className="text-center py-6"><p className="font-semibold" style={{ color: T.navy }}>Sign in to use Board Prep</p><p className="text-sm mt-1" style={{ color: T.textMuted }}>Track your daily score and streak.</p><button onClick={handleBack} className="mt-5 h-10 px-6 rounded-xl font-semibold text-white" style={{ backgroundColor: T.brandRed }}>Back to Feed</button></div></Card>}
        {phase === "error" && <Card className="p-5"><div className="text-center py-6"><p className="font-semibold" style={{ color: T.danger }}>Something went wrong</p><p className="text-sm mt-1" style={{ color: T.textMuted }}>{error}</p><button onClick={fetchDaily} className="mt-5 inline-flex items-center gap-2 h-10 px-6 rounded-xl font-semibold text-white" style={{ backgroundColor: T.navy }}><RotateCcw size={15} />Retry</button></div></Card>}
        {phase === "exhausted" && <ExhaustedPhase message={exhaustedMessage} onRestart={startReviewQuiz} onStudy={() => router.push("/tools/board-prep/study")} onBack={handleBack} />}
        {phase === "intro" && <IntroPhase streak={streak} questions={questions} onStart={() => { setQuestionIdx(0); setSelected(null); setResult(null); setPracticeMode(false); setPhase(questions.length ? "question" : "exhausted"); }} onStudy={() => router.push("/tools/board-prep/study")} />}
        {phase === "question" && currentQuestion && <QuestionPhase question={currentQuestion} questionIndex={questionIdx} selected={selected} result={result} submitting={submitting} streak={streak} practice={practiceMode} isFlashcard={currentIsFlashcard} totalQuestions={totalQuestions} onSelect={setSelected} onSubmit={handleSubmit} onNext={handleNext} />}
        {phase === "question" && !currentQuestion && <ExhaustedPhase message={exhaustedMessage} onRestart={startReviewQuiz} onStudy={() => router.push("/tools/board-prep/study")} onBack={handleBack} />}
        {phase === "done" && <DonePhase score={practiceMode ? practiceScore : (session?.score ?? 0)} streak={streak} practice={practiceMode} totalQuestions={totalQuestions} onReview={startReviewQuiz} onStudy={() => router.push("/tools/board-prep/study")} />}
      </ToolPage>
    </AppShell>
  );
}
