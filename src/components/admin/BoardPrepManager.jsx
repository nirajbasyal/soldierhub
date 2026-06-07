"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Edit3,
  Inbox,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";

const EMPTY_FORM = {
  id: null,
  category: "Regulation ID",
  source_publication: "",
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "a",
  explanation: "",
  difficulty: "basic",
  active: true,
};

const REQUEST_FILTERS = ["pending", "all", "approved", "rejected", "reviewed"];
const OPTION_KEYS = ["a", "b", "c", "d"];

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function apiJson(path, { method = "GET", body } = {}) {
  const token = await getAccessToken();
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed.");
  return json;
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
      <div className="text-2xl font-serif font-bold" style={{ color: T.navy }}>{value}</div>
      <div className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: T.textMuted }}>{label}</div>
    </div>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <div className={`rounded-[1.75rem] border p-4 shadow-sm ${className}`} style={{ borderColor: T.border, backgroundColor: T.surface }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: T.textMuted }}>{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function inputClass() {
  return "w-full rounded-2xl border px-3 py-2.5 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-[#1E4E8C]/20";
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function RequestTypePill({ type }) {
  const label = String(type || "request").toUpperCase();
  const bg = type === "remove" ? T.redBg : type === "update" ? T.goldBg : T.blueSoft;
  const color = type === "remove" ? T.brandRed : type === "update" ? T.gold : T.blue;
  return <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={{ backgroundColor: bg, color }}>{label}</span>;
}

function DeleteConfirmModal({ target, deleting, onCancel, onConfirm }) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B1C2C]/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border p-5 shadow-2xl" style={{ backgroundColor: T.card, borderColor: T.border }}>
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
            <AlertTriangle size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-serif font-black" style={{ color: T.navy }}>Delete Board Prep question?</h3>
            <p className="mt-1 text-sm leading-6" style={{ color: T.textMuted }}>
              This removes the full question from the admin list and daily quiz pool.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border p-3" style={{ borderColor: T.borderSoft, backgroundColor: T.surface }}>
          <p className="line-clamp-3 text-sm font-bold leading-6" style={{ color: T.text }}>{target.question}</p>
          <p className="mt-1 text-xs font-semibold" style={{ color: T.textMuted }}>{target.category} · {target.source_publication || "No publication"}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-11 rounded-2xl border text-sm font-black disabled:opacity-50"
            style={{ borderColor: T.border, backgroundColor: T.card, color: T.navy }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 rounded-2xl text-sm font-black text-white disabled:opacity-50"
            style={{ backgroundColor: T.brandRed }}
          >
            {deleting ? "Deleting..." : "Delete question"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BoardPrepManager({ onPendingRequestCountChange } = {}) {
  const [questions, setQuestions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [requestStatus, setRequestStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState(null);

  const editorRef = useRef(null);
  const questionInputRef = useRef(null);

  const activeCount = useMemo(() => questions.filter((q) => q.active).length, [questions]);
  const pendingCount = useMemo(() => requests.filter((r) => r.status === "pending").length, [requests]);

  useEffect(() => {
    if (typeof onPendingRequestCountChange === "function" && (requestStatus === "pending" || requestStatus === "all")) {
      onPendingRequestCountChange(pendingCount);
    }
  }, [pendingCount, requestStatus, onPendingRequestCountChange]);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const [questionJson, requestJson] = await Promise.all([
        apiJson(`/api/admin/board-prep/questions?active=all&q=${encodeURIComponent(query)}`),
        apiJson(`/api/admin/board-prep/requests?status=${encodeURIComponent(requestStatus)}`),
      ]);
      setQuestions(questionJson.data || []);
      setRequests(requestJson.data || []);
    } catch (err) {
      setMessage(err.message || "Could not load Board Prep admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function focusEditor() {
    window.setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      questionInputRef.current?.focus({ preventScroll: true });
    }, 50);
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function editQuestion(q) {
    setForm({
      id: q.id,
      category: q.category || "General",
      source_publication: q.source_publication || "",
      question: q.question || "",
      option_a: q.option_a || "",
      option_b: q.option_b || "",
      option_c: q.option_c || "",
      option_d: q.option_d || "",
      correct_option: q.correct_option || "a",
      explanation: q.explanation || "",
      difficulty: q.difficulty || "basic",
      active: q.active !== false,
    });
    setMessage("Question loaded in the editor. Review and save changes.");
    focusEditor();
  }

  function startAddQuestion() {
    setForm(EMPTY_FORM);
    setMessage("Editor ready for a new question.");
    focusEditor();
  }

  function prefillFromRequest(request) {
    const linked = questions.find((q) => q.id === request.question_id);

    if (request.request_type === "add") {
      setForm({
        ...EMPTY_FORM,
        category: request.category || EMPTY_FORM.category,
        question: request.suggested_question || request.message || "",
        explanation: request.suggested_answer || "",
      });
      setMessage("Request copied into the add-question form. Review it before saving.");
      focusEditor();
    } else if (linked) {
      editQuestion(linked);
      setMessage("Linked question loaded. Review the user's request before saving changes.");
    } else {
      setForm({ ...EMPTY_FORM, category: request.category || EMPTY_FORM.category, question: request.message || "" });
      setMessage("No linked question was found. Request note copied into the form for review.");
      focusEditor();
    }
  }

  async function saveQuestion() {
    setSaving(true);
    setMessage(null);
    try {
      const method = form.id ? "PATCH" : "POST";
      await apiJson("/api/admin/board-prep/questions", { method, body: form });
      setForm(EMPTY_FORM);
      setMessage(form.id ? "Question updated." : "Question added.");
      await load();
    } catch (err) {
      setMessage(err.message || "Could not save question.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteQuestion() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    setMessage(null);
    try {
      await apiJson(`/api/admin/board-prep/questions?id=${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      if (form.id === deleteTarget.id) setForm(EMPTY_FORM);
      setDeleteTarget(null);
      setMessage("Question deleted from Board Prep.");
      await load();
    } catch (err) {
      setMessage(err.message || "Could not delete question.");
    } finally {
      setDeleting(false);
    }
  }

  async function updateRequestStatus(id, status) {
    try {
      await apiJson("/api/admin/board-prep/requests", { method: "PATCH", body: { id, status } });
      setMessage(status === "approved" ? "Request approved." : status === "rejected" ? "Request rejected." : "Request updated.");
      await load();
    } catch (err) {
      setMessage(err.message || "Could not update request.");
    }
  }

  return (
    <div className="space-y-5">
      <DeleteConfirmModal
        target={deleteTarget}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteQuestion}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
            <BookOpen size={23} />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold" style={{ color: T.navy }}>Board Prep admin</h2>
            <p className="mt-1 text-sm leading-6" style={{ color: T.textMuted }}>
              Add, edit, delete, and review requested promotion board questions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={startAddQuestion}
          className="h-11 rounded-2xl px-4 text-sm font-black text-white shadow-sm"
          style={{ backgroundColor: T.brandRed }}
        >
          Add question
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Questions" value={questions.length} />
        <Stat label="Active" value={activeCount} />
        <Stat label="Requests" value={pendingCount} />
      </div>

      {message && (
        <div
          className="rounded-2xl border px-4 py-3 text-sm font-semibold"
          style={{
            borderColor: T.border,
            backgroundColor: T.surface,
            color: message.includes("Could") || message.includes("failed") || message.includes("No linked") ? T.danger : T.success,
          }}
        >
          {message}
        </div>
      )}

      <SectionCard>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
              <Inbox size={18} />
            </div>
            <div>
              <h3 className="font-black" style={{ color: T.navy }}>User request inbox</h3>
              <p className="mt-1 text-xs leading-5" style={{ color: T.textMuted }}>
                User add, update, and remove requests appear here for admin review.
              </p>
            </div>
          </div>
          <button onClick={load} className="inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-bold" style={{ backgroundColor: T.card, color: T.navy, borderColor: T.border }}>
            <RotateCcw size={14} />Refresh
          </button>
        </div>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {REQUEST_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setRequestStatus(status)}
              className="h-9 rounded-full px-3 text-xs font-black capitalize whitespace-nowrap"
              style={{ backgroundColor: requestStatus === status ? T.navy : T.card, color: requestStatus === status ? "#fff" : T.textMuted, border: `1px solid ${T.border}` }}
            >
              {status}
            </button>
          ))}
          <button onClick={load} className="h-9 rounded-full px-3 text-xs font-black whitespace-nowrap" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
            Apply
          </button>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: T.textMuted }}>Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm" style={{ color: T.textMuted }}>No {requestStatus === "all" ? "" : requestStatus} requests.</p>
        ) : requests.map((r) => {
          const linked = questions.find((q) => q.id === r.question_id);
          return (
            <div key={r.id} className="mb-3 rounded-2xl border p-3 last:mb-0" style={{ borderColor: T.border, backgroundColor: T.card }}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <RequestTypePill type={r.request_type} />
                    <span className="text-[11px] font-black capitalize" style={{ color: r.status === "pending" ? T.gold : r.status === "approved" ? T.success : r.status === "rejected" ? T.danger : T.textMuted }}>{r.status}</span>
                    {r.category && <span className="text-[11px]" style={{ color: T.textSubtle }}>{r.category}</span>}
                    {r.created_at && <span className="text-[11px]" style={{ color: T.textSubtle }}>{formatDate(r.created_at)}</span>}
                  </div>
                  <p className="text-sm font-semibold leading-6" style={{ color: T.text }}>{r.message}</p>
                  {linked && <p className="mt-2 rounded-xl px-2 py-1 text-xs font-semibold" style={{ backgroundColor: T.blueSoft, color: T.blue }}>Linked: {linked.question}</p>}
                  {r.suggested_question && <p className="mt-2 text-xs leading-5" style={{ color: T.textMuted }}>Suggested question: {r.suggested_question}</p>}
                  {r.suggested_answer && <p className="mt-1 text-xs leading-5" style={{ color: T.textMuted }}>Suggested answer: {r.suggested_answer}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button title="Copy into editor" onClick={() => prefillFromRequest(r)} className="flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-black" style={{ backgroundColor: T.blueSoft, color: T.blue }}><Edit3 size={15} />Edit</button>
                  {r.status === "pending" && <button title="Approve request" onClick={() => updateRequestStatus(r.id, "approved")} className="flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-black" style={{ backgroundColor: T.successBg, color: T.success }}><CheckCircle size={15} />Approve</button>}
                  {r.status === "pending" && <button title="Reject request" onClick={() => updateRequestStatus(r.id, "rejected")} className="flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-black" style={{ backgroundColor: T.redBg, color: T.brandRed }}><X size={15} />Reject</button>}
                </div>
              </div>
            </div>
          );
        })}
      </SectionCard>

      <SectionCard ref={editorRef} className="scroll-mt-6">
        <div ref={editorRef} className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.brandRed }}>
              Question editor
            </p>
            <h3 className="mt-1 text-xl font-serif font-black" style={{ color: T.navy }}>{form.id ? "Edit question" : "Add question"}</h3>
          </div>
          {form.id && (
            <button onClick={() => setForm(EMPTY_FORM)} className="inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-black" style={{ borderColor: T.border, color: T.brandRed, backgroundColor: T.card }}>
              <X size={14} />Cancel edit
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Category"><input className={inputClass()} style={{ borderColor: T.border, color: T.text }} value={form.category} onChange={(e) => updateForm("category", e.target.value)} /></Field>
          <Field label="Publication"><input className={inputClass()} style={{ borderColor: T.border, color: T.text }} value={form.source_publication} onChange={(e) => updateForm("source_publication", e.target.value)} placeholder="AR 670-1" /></Field>
        </div>
        <div className="mt-3">
          <Field label="Question"><textarea ref={questionInputRef} rows={3} className={inputClass()} style={{ borderColor: T.border, color: T.text }} value={form.question} onChange={(e) => updateForm("question", e.target.value)} /></Field>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {OPTION_KEYS.map((key) => (
            <Field key={key} label={`Option ${key.toUpperCase()}`}>
              <input className={inputClass()} style={{ borderColor: T.border, color: T.text }} value={form[`option_${key}`]} onChange={(e) => updateForm(`option_${key}`, e.target.value)} />
            </Field>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Field label="Correct"><select className={inputClass()} style={{ borderColor: T.border, color: T.text }} value={form.correct_option} onChange={(e) => updateForm("correct_option", e.target.value)}><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select></Field>
          <Field label="Difficulty"><select className={inputClass()} style={{ borderColor: T.border, color: T.text }} value={form.difficulty} onChange={(e) => updateForm("difficulty", e.target.value)}><option value="basic">Basic</option><option value="medium">Medium</option><option value="hard">Hard</option></select></Field>
          <Field label="Status"><select className={inputClass()} style={{ borderColor: T.border, color: T.text }} value={form.active ? "true" : "false"} onChange={(e) => updateForm("active", e.target.value === "true")}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
        </div>
        <div className="mt-3">
          <Field label="Explanation"><textarea rows={3} className={inputClass()} style={{ borderColor: T.border, color: T.text }} value={form.explanation} onChange={(e) => updateForm("explanation", e.target.value)} /></Field>
        </div>
        <button onClick={saveQuestion} disabled={saving} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-black text-white disabled:opacity-50" style={{ backgroundColor: T.brandRed }}>
          <Save size={16} />{saving ? "Saving..." : form.id ? "Save changes" : "Add question"}
        </button>
      </SectionCard>

      <SectionCard>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-serif font-black" style={{ color: T.navy }}>Question bank</h3>
            <p className="mt-1 text-xs leading-5" style={{ color: T.textMuted }}>Edit or delete Board Prep questions from the active admin database.</p>
          </div>
          <div className="flex gap-2 md:min-w-[340px]">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textSubtle }}><Search size={15} /></span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions..." className="h-11 w-full rounded-2xl border pl-9 pr-3 text-sm font-semibold outline-none" style={{ borderColor: T.border, color: T.text }} />
            </div>
            <button onClick={load} className="inline-flex h-11 items-center gap-2 rounded-2xl px-4 font-black text-white" style={{ backgroundColor: T.navy }}><RotateCcw size={15} />Load</button>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? <p className="text-sm" style={{ color: T.textMuted }}>Loading questions...</p> : questions.map((q) => (
            <div key={q.id} className="rounded-2xl border p-4" style={{ borderColor: T.border, backgroundColor: T.card }}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2.5 py-1 text-xs font-black" style={{ backgroundColor: T.blueSoft, color: T.blue }}>{q.category}</span>
                    <span className="text-xs font-semibold" style={{ color: T.textSubtle }}>{q.source_publication}</span>
                    {q.active ? <span className="text-xs font-black" style={{ color: T.success }}>Active</span> : <span className="text-xs font-black" style={{ color: T.danger }}>Inactive</span>}
                  </div>
                  <p className="font-bold leading-6" style={{ color: T.text }}>{q.question}</p>
                  <p className="mt-1 text-xs font-semibold" style={{ color: T.textMuted }}>Correct: {String(q.correct_option || "").toUpperCase()} · {q.difficulty}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => editQuestion(q)} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-black" style={{ backgroundColor: T.blueSoft, color: T.blue }}><Edit3 size={15} />Edit</button>
                  <button onClick={() => setDeleteTarget(q)} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-black" style={{ backgroundColor: T.redBg, color: T.brandRed }}><Trash2 size={15} />Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
