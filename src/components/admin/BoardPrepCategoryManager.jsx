"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2, RotateCcw, Save, Tags } from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
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

function inputClass() {
  return "w-full rounded-2xl border px-3 py-2.5 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-[#1E4E8C]/20";
}

export default function BoardPrepCategoryManager({ onCategoriesRenamed } = {}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadCategories() {
    setLoading(true);
    setMessage(null);
    try {
      const json = await apiJson("/api/admin/board-prep/categories");
      const rows = json.data || [];
      setCategories(rows);
      setDrafts((current) => {
        const next = {};
        rows.forEach((row) => {
          next[row.name] = current[row.name] ?? row.name;
        });
        return next;
      });
      setLoaded(true);
    } catch (err) {
      setMessage(err.message || "Could not load Board Prep categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !loaded && !loading) {
      loadCategories();
    }
  }, [open, loaded, loading]);

  const renames = useMemo(
    () =>
      categories
        .map((row) => ({ from: row.name, to: String(drafts[row.name] || "").trim().replace(/\s+/g, " "), count: row.count || 0 }))
        .filter((item) => item.from && item.to && item.from !== item.to),
    [categories, drafts]
  );

  const totalAffectedQuestions = renames.reduce((sum, item) => sum + item.count, 0);

  function updateDraft(oldName, nextName) {
    setDrafts((current) => ({ ...current, [oldName]: nextName }));
  }

  function resetDrafts() {
    const next = {};
    categories.forEach((row) => {
      next[row.name] = row.name;
    });
    setDrafts(next);
    setMessage("Category name drafts reset.");
  }

  async function saveCategoryNames() {
    if (!renames.length) {
      setMessage("No category name changes to save.");
      return;
    }

    const confirmText = `Rename ${renames.length} categor${renames.length === 1 ? "y" : "ies"} and update ${totalAffectedQuestions} Board Prep question${totalAffectedQuestions === 1 ? "" : "s"}?`;
    if (typeof window !== "undefined" && !window.confirm(confirmText)) return;

    setSaving(true);
    setMessage(null);
    try {
      const json = await apiJson("/api/admin/board-prep/categories", {
        method: "PATCH",
        body: { renames },
      });
      const updatedCount = json.count || 0;
      setMessage(`Category names saved. Updated ${updatedCount} Board Prep question${updatedCount === 1 ? "" : "s"}.`);
      await loadCategories();
      onCategoriesRenamed?.();
    } catch (err) {
      setMessage(err.message || "Could not save category names.");
    } finally {
      setSaving(false);
    }
  }

  const isErrorMessage = message && /could|cannot|error|required|failed/i.test(message);

  return (
    <div className="rounded-[1.75rem] border p-4 shadow-sm" style={{ borderColor: T.border, backgroundColor: T.surface }}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-start justify-between gap-3 text-left">
        <span className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
            <Tags size={19} />
          </span>
          <span className="min-w-0">
            <span className="block font-black" style={{ color: T.navy }}>Bulk category rename</span>
            <span className="mt-1 block text-xs leading-5" style={{ color: T.textMuted }}>
              Collapsed by default. Open only when you need to rename categories across all Board Prep questions.
            </span>
          </span>
        </span>
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: T.textMuted }} />
      </button>

      {open && (
        <div className="mt-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <p className="text-xs leading-5" style={{ color: T.textMuted }}>
              Edit category names here and save once. Every Board Prep question using the old category name will be updated.
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={loadCategories}
                disabled={loading || saving}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-black disabled:opacity-50"
                style={{ backgroundColor: T.card, borderColor: T.border, color: T.navy }}
              >
                <RotateCcw size={14} />Refresh
              </button>
              <button
                type="button"
                onClick={resetDrafts}
                disabled={loading || saving || categories.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-black disabled:opacity-50"
                style={{ backgroundColor: T.card, borderColor: T.border, color: T.textMuted }}
              >
                Reset
              </button>
            </div>
          </div>

          {message && (
            <div
              className="mb-4 flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold"
              style={{
                borderColor: isErrorMessage ? "rgba(179,25,66,0.16)" : T.border,
                backgroundColor: isErrorMessage ? T.redBg : T.card,
                color: isErrorMessage ? T.danger : T.success,
              }}
            >
              {isErrorMessage ? <AlertTriangle size={15} className="mt-0.5 shrink-0" /> : null}
              <span>{message}</span>
            </div>
          )}

          {loading ? (
            <p className="text-sm" style={{ color: T.textMuted }}>Loading categories...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm" style={{ color: T.textMuted }}>No Board Prep categories found.</p>
          ) : (
            <div className="space-y-3">
              {categories.map((row) => {
                const changed = String(drafts[row.name] || "").trim() !== row.name;
                return (
                  <div key={row.name} className="grid gap-2 rounded-2xl border p-3 md:grid-cols-[1fr_1.3fr_110px] md:items-end" style={{ borderColor: changed ? "rgba(30,78,140,0.32)" : T.border, backgroundColor: T.card }}>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: T.textMuted }}>Current category</p>
                      <p className="mt-1 truncate text-sm font-black" style={{ color: T.navy }}>{row.name}</p>
                      <p className="mt-1 text-xs font-semibold" style={{ color: T.textSubtle }}>{row.activeCount || 0} active / {row.count || 0} total questions</p>
                    </div>
                    <label className="block">
                      <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: T.textMuted }}>New category name</span>
                      <input
                        value={drafts[row.name] ?? row.name}
                        onChange={(event) => updateDraft(row.name, event.target.value)}
                        className={inputClass()}
                        style={{ borderColor: changed ? T.blue : T.border, color: T.text }}
                        maxLength={80}
                      />
                    </label>
                    <div className="rounded-2xl px-3 py-2 text-center text-xs font-black" style={{ backgroundColor: changed ? T.blueSoft : T.surface, color: changed ? T.blue : T.textSubtle }}>
                      {changed ? `${row.count || 0} updates` : "No change"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={saveCategoryNames}
            disabled={saving || loading || renames.length === 0}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: T.navy }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving category names..." : renames.length ? `Save ${renames.length} category rename${renames.length === 1 ? "" : "s"}` : "No category changes"}
          </button>
        </div>
      )}
    </div>
  );
}
