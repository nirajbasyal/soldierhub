"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DoorOpen,
  Edit3,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import {
  adminCreateGate,
  adminDeleteGate,
  adminUpdateGate,
  listGates,
} from "@/lib/db/gates";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EMPTY_FORM = {
  name: "",
  label: "Access Gate",
  hours: "24/7",
  note: "",
  status_type: "always",
  open_time: "",
  close_time: "",
  days: [],
  custom_status_text: "",
  custom_is_open: true,
  is_active: true,
  display_order: 0,
};

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function toInputTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span
        className="text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: T.textSubtle }}
      >
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function inputStyle() {
  return {
    backgroundColor: T.card,
    borderColor: "#D5E2F2",
    color: T.text,
  };
}

function gateScheduleLabel(gate) {
  if (gate.status_type === "closed") return "Listed closed";
  if (gate.status_type === "weekday-limited") return "Limited hours";
  if (gate.status_type === "custom") return gate.custom_status_text || "Custom label";
  return "24/7 / always listed";
}

function GateRow({ gate, onEdit, onDelete }) {
  return (
    <article
      className="rounded-3xl border p-4 md:p-5 relative overflow-hidden"
      style={{
        backgroundColor: T.card,
        borderColor: "#D5E2F2",
        boxShadow: "0 10px 26px rgba(7,27,51,0.05)",
      }}
    >
      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#1E4E8C]" />

      <div className="pl-2 flex flex-col sm:flex-row sm:items-start gap-4">
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(220,232,247,0.95)", color: T.blue }}
        >
          <DoorOpen size={20} strokeWidth={2.25} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base md:text-lg font-extrabold leading-snug" style={{ color: T.navy }}>
              {gate.name}
            </h3>

            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ backgroundColor: "rgba(220,232,247,0.95)", color: T.blue }}
            >
              {gate.label || "Access Gate"}
            </span>

            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ backgroundColor: gate.is_active ? "rgba(236,247,239,0.95)" : "rgba(253,236,240,0.95)", color: gate.is_active ? T.success : T.brandRed }}
            >
              {gate.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          <p className="mt-2 text-sm font-bold leading-6" style={{ color: T.text }}>
            {gate.hours}
          </p>

          <p className="text-xs font-semibold" style={{ color: T.textSubtle }}>
            {gateScheduleLabel(gate)} · Order {gate.display_order ?? 0}
          </p>

          {gate.note ? (
            <p className="mt-2 text-sm leading-6 line-clamp-2" style={{ color: T.textMuted }}>
              {gate.note}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6" style={{ color: T.textSubtle }}>
              No note added.
            </p>
          )}
        </div>

        <div className="flex sm:flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(gate)}
            className="inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5"
            style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: "#D5E2F2", color: T.navy }}
          >
            <Edit3 size={14} />
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(gate)}
            className="inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5"
            style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default function GateManager({ onCountChange }) {
  const { pushToast } = useApp();

  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const isEditing = Boolean(editingId);

  const loadGates = useCallback(async () => {
    setLoading(true);

    const { data, error } = await listGates({ includeInactive: true });

    if (error) {
      pushToast(error.message || "Could not load gates.", "error");
      setLoading(false);
      return;
    }

    const nextGates = data || [];
    setGates(nextGates);
    onCountChange?.(nextGates.length);
    setLoading(false);
  }, [onCountChange, pushToast]);

  useEffect(() => {
    loadGates();
  }, [loadGates]);

  const filteredGates = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) return gates;

    return gates.filter((gate) => {
      const searchable = normalizeText(`${gate.name} ${gate.label} ${gate.hours} ${gate.note}`);
      return searchable.includes(q);
    });
  }, [gates, searchQuery]);

  const activeCount = useMemo(() => gates.filter((gate) => gate.is_active).length, [gates]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day) => {
    setForm((prev) => {
      const currentDays = Array.isArray(prev.days) ? prev.days : [];
      const exists = currentDays.includes(day);
      return {
        ...prev,
        days: exists ? currentDays.filter((item) => item !== day) : [...currentDays, day],
      };
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Gate name is required.";
    if (!form.label.trim()) return "Gate label is required.";
    if (!form.hours.trim()) return "Published hours are required.";

    if (form.status_type === "weekday-limited") {
      if (!form.days.length) return "Select at least one open day for limited-hour gates.";
      if (!form.open_time || !form.close_time) return "Open and close time are required for limited-hour gates.";
    }

    if (form.status_type === "custom" && !form.custom_status_text.trim()) {
      return "Custom public label is required for custom gate entries.";
    }

    return null;
  };

  const buildPayload = () => {
    const statusType = form.status_type || "always";

    return {
      name: form.name.trim(),
      label: form.label.trim(),
      hours: form.hours.trim(),
      note: form.note.trim(),
      status_type: statusType,
      open_time: statusType === "weekday-limited" ? form.open_time : null,
      close_time: statusType === "weekday-limited" ? form.close_time : null,
      days: statusType === "weekday-limited" ? form.days : [],
      custom_status_text: statusType === "custom" ? form.custom_status_text.trim() : "",
      custom_is_open: statusType === "custom" ? Boolean(form.custom_is_open) : null,
      is_active: Boolean(form.is_active),
      display_order: Number(form.display_order) || 0,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      pushToast(validationError, "error");
      return;
    }

    setSaving(true);
    const payload = buildPayload();

    const { error } = isEditing
      ? await adminUpdateGate(editingId, payload)
      : await adminCreateGate(payload);

    setSaving(false);

    if (error) {
      pushToast(error.message || "Gate could not be saved.", "error");
      return;
    }

    pushToast(isEditing ? "Gate updated" : "Gate added", "success");
    resetForm();
    loadGates();
  };

  const startEdit = (gate) => {
    setEditingId(gate.id);
    setForm({
      name: gate.name || "",
      label: gate.label || "Access Gate",
      hours: gate.hours || "24/7",
      note: gate.note || "",
      status_type: gate.status_type || "always",
      open_time: toInputTime(gate.open_time),
      close_time: toInputTime(gate.close_time),
      days: Array.isArray(gate.days) ? gate.days : [],
      custom_status_text: gate.custom_status_text || "",
      custom_is_open: gate.custom_is_open !== false,
      is_active: gate.is_active !== false,
      display_order: gate.display_order ?? 0,
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    const { error } = await adminDeleteGate(confirmDelete.id);

    if (error) {
      pushToast(error.message || "Could not delete gate.", "error");
      return;
    }

    pushToast("Gate deleted", "info");

    if (editingId === confirmDelete.id) resetForm();

    setConfirmDelete(null);
    loadGates();
  };

  const useWeekdays = () => updateField("days", WEEKDAYS);
  const useAllDays = () => updateField("days", ALL_DAYS);

  return (
    <div className="flex flex-col gap-5">
      <section
        className="rounded-[28px] border overflow-hidden relative"
        style={{
          background:
            "linear-gradient(135deg, rgba(220,232,247,0.95), rgba(253,254,255,0.98), rgba(253,236,240,0.72))",
          borderColor: "#BCD0EA",
        }}
      >
        <div className="absolute left-0 top-0 h-full w-1.5 bg-[#B31942]" />
        <div className="absolute right-0 top-0 h-full w-1.5 bg-[#1E4E8C]" />

        <div className="p-4 md:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pl-2">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]"
                style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2", color: T.blue }}
              >
                <DoorOpen size={14} />
                Gate hours manager
              </div>

              <h2 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-[-0.03em]" style={{ color: T.navy }}>
                {isEditing ? "Edit gate" : "Create gate"}
              </h2>

              <p className="mt-1 text-sm leading-6 max-w-2xl" style={{ color: T.textMuted }}>
                Manage public gate-hours information shown on the Gate Hours page. This is public schedule information only, not real-time operational gate status.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:min-w-[220px]">
              <div className="rounded-2xl border p-3" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                <div className="text-2xl font-extrabold tabular-nums" style={{ color: T.navy }}>{gates.length}</div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>Gates</div>
              </div>
              <div className="rounded-2xl border p-3" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                <div className="text-2xl font-extrabold tabular-nums" style={{ color: T.navy }}>{activeCount}</div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>Active</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 pl-2">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Gate name">
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="MSG Pena Gate"
                  className="w-full h-11 rounded-2xl border px-3 text-sm outline-none placeholder:text-[#A8ABB2]"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Gate label">
                <input
                  value={form.label}
                  onChange={(e) => updateField("label", e.target.value)}
                  placeholder="Main Gate"
                  className="w-full h-11 rounded-2xl border px-3 text-sm outline-none placeholder:text-[#A8ABB2]"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Published hours">
                <input
                  value={form.hours}
                  onChange={(e) => updateField("hours", e.target.value)}
                  placeholder="24/7 or Mon-Fri · 5 AM-9 PM"
                  className="w-full h-11 rounded-2xl border px-3 text-sm outline-none placeholder:text-[#A8ABB2]"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Schedule type">
                <select
                  value={form.status_type}
                  onChange={(e) => updateField("status_type", e.target.value)}
                  className="w-full h-11 rounded-2xl border px-3 text-sm outline-none"
                  style={inputStyle()}
                >
                  <option value="always">Published 24/7</option>
                  <option value="weekday-limited">Limited published hours</option>
                  <option value="closed">Listed closed</option>
                  <option value="custom">Custom public label</option>
                </select>
              </Field>

              <Field label="Display order">
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => updateField("display_order", e.target.value)}
                  className="w-full h-11 rounded-2xl border px-3 text-sm outline-none placeholder:text-[#A8ABB2]"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Visibility">
                <select
                  value={form.is_active ? "true" : "false"}
                  onChange={(e) => updateField("is_active", e.target.value === "true")}
                  className="w-full h-11 rounded-2xl border px-3 text-sm outline-none"
                  style={inputStyle()}
                >
                  <option value="true">Active / show publicly</option>
                  <option value="false">Inactive / hide publicly</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Note">
                  <textarea
                    value={form.note}
                    onChange={(e) => updateField("note", e.target.value)}
                    placeholder="Primary access gate."
                    rows={3}
                    className="w-full rounded-2xl border px-3 py-3 text-sm outline-none resize-none placeholder:text-[#A8ABB2]"
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </div>

            {form.status_type === "weekday-limited" && (
              <div className="mt-4 rounded-3xl border p-4" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Open time">
                    <input
                      type="time"
                      value={form.open_time}
                      onChange={(e) => updateField("open_time", e.target.value)}
                      className="w-full h-11 rounded-2xl border px-3 text-sm outline-none"
                      style={inputStyle()}
                    />
                  </Field>

                  <Field label="Close time">
                    <input
                      type="time"
                      value={form.close_time}
                      onChange={(e) => updateField("close_time", e.target.value)}
                      className="w-full h-11 rounded-2xl border px-3 text-sm outline-none"
                      style={inputStyle()}
                    />
                  </Field>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={useWeekdays} className="rounded-full border px-3 py-1.5 text-xs font-bold" style={{ borderColor: "#D5E2F2", color: T.blue, backgroundColor: T.card }}>Mon-Fri</button>
                  <button type="button" onClick={useAllDays} className="rounded-full border px-3 py-1.5 text-xs font-bold" style={{ borderColor: "#D5E2F2", color: T.blue, backgroundColor: T.card }}>Every day</button>
                  {ALL_DAYS.map((day) => {
                    const active = form.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className="rounded-full border px-3 py-1.5 text-xs font-bold"
                        style={{
                          borderColor: active ? T.blue : "#D5E2F2",
                          backgroundColor: active ? "rgba(220,232,247,0.95)" : T.card,
                          color: active ? T.blue : T.textMuted,
                        }}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {form.status_type === "custom" && (
              <div className="mt-4 grid md:grid-cols-2 gap-3 rounded-3xl border p-4" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                <Field label="Custom public label">
                  <input
                    value={form.custom_status_text}
                    onChange={(e) => updateField("custom_status_text", e.target.value)}
                    placeholder="Holiday hours"
                    className="w-full h-11 rounded-2xl border px-3 text-sm outline-none placeholder:text-[#A8ABB2]"
                    style={inputStyle()}
                  />
                </Field>

                <Field label="Label tone">
                  <select
                    value={form.custom_is_open ? "true" : "false"}
                    onChange={(e) => updateField("custom_is_open", e.target.value === "true")}
                    className="w-full h-11 rounded-2xl border px-3 text-sm outline-none"
                    style={inputStyle()}
                  >
                    <option value="true">Normal / blue label</option>
                    <option value="false">Closed / red label</option>
                  </select>
                </Field>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button type="submit" variant="primary" icon={isEditing ? Save : Plus} disabled={saving}>
                {saving ? "Saving..." : isEditing ? "Update gate" : "Add gate"}
              </Button>

              <Button type="button" variant="ghost" icon={RotateCcw} onClick={loadGates} disabled={saving || loading}>
                Refresh
              </Button>

              {isEditing && (
                <Button type="button" variant="ghost" icon={X} onClick={resetForm} disabled={saving}>
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
        </div>
      </section>

      <section
        className="rounded-[28px] border p-4 md:p-5"
        style={{ backgroundColor: "rgba(255,255,255,0.86)", borderColor: T.border }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(220,232,247,0.95)", color: T.blue }}
            >
              <DoorOpen size={20} />
            </div>

            <div>
              <h3 className="text-xl font-extrabold tracking-[-0.02em]" style={{ color: T.navy }}>
                Existing gates
              </h3>
              <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
                Edit, hide, reorder, or remove entries shown on the Gate Hours page.
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl border px-3 py-2.5 flex items-center gap-2 md:min-w-[260px]"
            style={{ backgroundColor: T.card, borderColor: "#D5E2F2" }}
          >
            <Search size={17} className="shrink-0" style={{ color: T.blue }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gates..."
              className="w-full bg-transparent outline-none text-sm placeholder:text-[#A8ABB2]"
              style={{ color: T.text }}
            />
          </div>
        </div>

        {loading ? (
          <div
            className="rounded-3xl border p-8 text-center text-sm"
            style={{ backgroundColor: T.card, borderColor: "#D5E2F2", color: T.textMuted }}
          >
            Loading gates...
          </div>
        ) : gates.length === 0 ? (
          <EmptyState icon={DoorOpen} title="No gates yet" body="Add your first gate above. It will appear on the Gate Hours page after it saves." />
        ) : filteredGates.length === 0 ? (
          <EmptyState icon={Search} title="No matching gates" body="Try searching by gate name, label, hours, or note." />
        ) : (
          <div className="grid gap-3">
            {filteredGates.map((gate) => (
              <GateRow
                key={gate.id}
                gate={gate}
                onEdit={startEdit}
                onDelete={setConfirmDelete}
              />
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.name || "this gate"}?`}
        body="This removes the gate from the public Gate Hours page. You can add it again later if needed. Use inactive instead if you only want to hide it temporarily."
        confirmText="Delete gate"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
