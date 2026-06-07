"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle, Edit3, RotateCcw, Save, Trash2, X } from "lucide-react";
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
    <div className="rounded-xl border p-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
      <div className="text-2xl font-serif font-bold" style={{ color: T.navy }}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: T.textMuted }}>{label}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: T.textMuted }}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function inputClass() {
  return "w-full rounded-xl border px-3 py-2 text-sm outline-none";
}

export default function BoardPrepManager() {
  const [questions, setQuestions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const activeCount = useMemo(() => questions.filter((q) => q.active).length, [questions]);
  const pendingCount = useMemo(() => requests.filter((r) => r.status === "pending").length, [requests]);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const [questionJson, requestJson] = await Promise.all([
        apiJson(`/api/admin/board-prep/questions?active=all&q=${encodeURIComponent(query)}`),
        apiJson("/api/admin/board-prep/requests?status=pending"),
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  async function deleteQuestion(id) {
    if (!window.confirm("Remove this question from active Board Prep?")) return;
    setMessage(null);
    try {
      await apiJson(`/api/admin/board-prep/questions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setMessage("Question removed from active pool.");
      await load();
    } catch (err) {
      setMessage(err.message || "Could not delete question.");
    }
  }

  async function updateRequestStatus(id, status) {
    try {
      await apiJson("/api/admin/board-prep/requests", { method: "PATCH", body: { id, status } });
      await load();
    } catch (err) {
      setMessage(err.message || "Could not update request.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
          <BookOpen size={22} />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold" style={{ color: T.navy }}>Board Prep admin</h2>
          <p className="text-sm" style={{ color: T.textMuted }}>Add, edit, remove, and review requested board questions.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Questions" value={questions.length} />
        <Stat label="Active" value={activeCount} />
        <Stat label="Requests" value={pendingCount} />
      </div>

      {message && (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: T.border, backgroundColor: T.surface, color: message.includes("Could") || message.includes("failed") ? T.danger : T.success }}>
          {message}
        </div>
      )}

      <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold" style={{ color: T.navy }}>{form.id ? "Edit question" : "Add question"}</h3>
          {form.id && <button onClick={() => setForm(EMPTY_FORM)} className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: T.brandRed }}><X size={14} />Cancel</button>}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Category"><input className={inputClass()} style={{ borderColor: T.border }} value={form.category} onChange={(e) => updateForm("category", e.target.value)} /></Field>
          <Field label="Publication"><input className={inputClass()} style={{ borderColor: T.border }} value={form.source_publication} onChange={(e) => updateForm("source_publication", e.target.value)} placeholder="AR 670-1" /></Field>
        </div>
        <Field label="Question"><textarea rows={2} className={inputClass()} style={{ borderColor: T.border }} value={form.question} onChange={(e) => updateForm("question", e.target.value)} /></Field>
        <div className="grid md:grid-cols-2 gap-3">
          {['a','b','c','d'].map((key) => <Field key={key} label={`Option ${key.toUpperCase()}`}><input className={inputClass()} style={{ borderColor: T.border }} value={form[`option_${key}`]} onChange={(e) => updateForm(`option_${key}`, e.target.value)} /></Field>)}
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Correct"><select className={inputClass()} style={{ borderColor: T.border }} value={form.correct_option} onChange={(e) => updateForm("correct_option", e.target.value)}><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select></Field>
          <Field label="Difficulty"><select className={inputClass()} style={{ borderColor: T.border }} value={form.difficulty} onChange={(e) => updateForm("difficulty", e.target.value)}><option value="basic">Basic</option><option value="medium">Medium</option><option value="hard">Hard</option></select></Field>
          <Field label="Status"><select className={inputClass()} style={{ borderColor: T.border }} value={form.active ? "true" : "false"} onChange={(e) => updateForm("active", e.target.value === "true")}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
        </div>
        <Field label="Explanation"><textarea rows={2} className={inputClass()} style={{ borderColor: T.border }} value={form.explanation} onChange={(e) => updateForm("explanation", e.target.value)} /></Field>
        <button onClick={saveQuestion} disabled={saving} className="w-full h-11 rounded-xl font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: T.brandRed }}>
          <Save size={16} />{saving ? "Saving..." : form.id ? "Save changes" : "Add question"}
        </button>
      </div>

      <div className="flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions..." className="flex-1 h-11 rounded-xl border px-3 text-sm outline-none" style={{ borderColor: T.border }} />
        <button onClick={load} className="h-11 px-4 rounded-xl font-semibold text-white inline-flex items-center gap-2" style={{ backgroundColor: T.navy }}><RotateCcw size={15} />Load</button>
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-sm" style={{ color: T.textMuted }}>Loading...</p> : questions.map((q) => (
          <div key={q.id} className="rounded-2xl border p-4" style={{ borderColor: T.border, backgroundColor: T.card }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2 mb-2"><span className="text-xs font-semibold rounded-full px-2 py-1" style={{ backgroundColor: T.blueSoft, color: T.blue }}>{q.category}</span><span className="text-xs" style={{ color: T.textSubtle }}>{q.source_publication}</span>{q.active ? <span className="text-xs" style={{ color: T.success }}>Active</span> : <span className="text-xs" style={{ color: T.danger }}>Inactive</span>}</div>
                <p className="font-semibold" style={{ color: T.text }}>{q.question}</p>
                <p className="text-xs mt-1" style={{ color: T.textMuted }}>Correct: {String(q.correct_option || '').toUpperCase()} · {q.difficulty}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => editQuestion(q)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.blueSoft, color: T.blue }}><Edit3 size={16} /></button>
                <button onClick={() => deleteQuestion(q.id)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.redBg, color: T.brandRed }}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: T.border, backgroundColor: T.surface }}>
        <h3 className="font-semibold mb-3" style={{ color: T.navy }}>User requests</h3>
        {requests.length === 0 ? <p className="text-sm" style={{ color: T.textMuted }}>No pending requests.</p> : requests.map((r) => (
          <div key={r.id} className="rounded-xl border p-3 mb-3 last:mb-0" style={{ borderColor: T.border, backgroundColor: T.card }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase" style={{ color: T.brandRed }}>{r.request_type}</p>
                <p className="text-sm mt-1" style={{ color: T.text }}>{r.message}</p>
                {r.suggested_question && <p className="text-xs mt-1" style={{ color: T.textMuted }}>Suggested: {r.suggested_question}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => updateRequestStatus(r.id, "approved")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.successBg, color: T.success }}><CheckCircle size={16} /></button>
                <button onClick={() => updateRequestStatus(r.id, "rejected")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.redBg, color: T.brandRed }}><X size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
