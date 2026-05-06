"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  Edit3,
  ExternalLink,
  FileText,
  Link2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import {
  adminCreateResource,
  adminDeleteResource,
  adminUpdateResource,
  listResources,
} from "@/lib/db/resources";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";

const EMPTY_FORM = {
  section: "",
  title: "",
  description: "",
  link: "",
};

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
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

function ResourceRow({ resource, onEdit, onDelete }) {
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
          <FileText size={20} strokeWidth={2.25} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base md:text-lg font-extrabold leading-snug" style={{ color: T.navy }}>
              {resource.title}
            </h3>

            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ backgroundColor: "rgba(220,232,247,0.95)", color: T.blue }}
            >
              {resource.section || "General"}
            </span>
          </div>

          {resource.description ? (
            <p className="mt-2 text-sm leading-6 line-clamp-2" style={{ color: T.textMuted }}>
              {resource.description}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6" style={{ color: T.textSubtle }}>
              No description added.
            </p>
          )}

          {resource.link ? (
            <a
              href={resource.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold max-w-full"
              style={{ color: T.blue }}
            >
              <span className="truncate">{resource.link}</span>
              <ExternalLink size={13} className="shrink-0" strokeWidth={2.4} />
            </a>
          ) : null}
        </div>

        <div className="flex sm:flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(resource)}
            className="inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5"
            style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: "#D5E2F2", color: T.navy }}
          >
            <Edit3 size={14} />
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(resource)}
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

export default function ResourceManager({ onCountChange }) {
  const { pushToast } = useApp();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const isEditing = Boolean(editingId);

  const loadResources = useCallback(async () => {
    setLoading(true);

    const { data, error } = await listResources();

    if (error) {
      pushToast(error.message || "Could not load resources.", "error");
      setLoading(false);
      return;
    }

    const nextResources = data || [];

    setResources(nextResources);
    onCountChange?.(nextResources.length);
    setLoading(false);
  }, [onCountChange, pushToast]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const filteredResources = useMemo(() => {
    const q = normalizeText(searchQuery);

    if (!q) return resources;

    return resources.filter((resource) => {
      const searchable = normalizeText(
        `${resource.section} ${resource.title} ${resource.description} ${resource.link}`
      );

      return searchable.includes(q);
    });
  }, [resources, searchQuery]);

  const sectionCount = useMemo(() => {
    return new Set(resources.map((resource) => resource.section || "General")).size;
  }, [resources]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const validateForm = () => {
    if (!form.section.trim()) return "Section is required.";
    if (!form.title.trim()) return "Title is required.";
    if (!form.link.trim()) return "Link is required.";

    try {
      new URL(form.link.trim());
    } catch {
      return "Enter a valid link starting with https://";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      pushToast(validationError, "error");
      return;
    }

    setSaving(true);

    const payload = {
      section: form.section.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      link: form.link.trim(),
    };

    const { error } = isEditing
      ? await adminUpdateResource(editingId, payload)
      : await adminCreateResource(payload);

    setSaving(false);

    if (error) {
      pushToast(error.message || "Resource could not be saved.", "error");
      return;
    }

    pushToast(isEditing ? "Resource updated" : "Resource added", "success");
    resetForm();
    loadResources();
  };

  const startEdit = (resource) => {
    setEditingId(resource.id);
    setForm({
      section: resource.section || "",
      title: resource.title || "",
      description: resource.description || "",
      link: resource.link || "",
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    const { error } = await adminDeleteResource(confirmDelete.id);

    if (error) {
      pushToast(error.message || "Could not delete resource.", "error");
      return;
    }

    pushToast("Resource deleted", "info");

    if (editingId === confirmDelete.id) {
      resetForm();
    }

    setConfirmDelete(null);
    loadResources();
  };

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
                <BookMarked size={14} />
                Resource manager
              </div>

              <h2 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-[-0.03em]" style={{ color: T.navy }}>
                {isEditing ? "Edit resource" : "Create resource"}
              </h2>

              <p className="mt-1 text-sm leading-6 max-w-2xl" style={{ color: T.textMuted }}>
                Add links that will appear on the public Resources page. These entries come from your admin dashboard and save to your existing Supabase resources table.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:min-w-[220px]">
              <div className="rounded-2xl border p-3" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                <div className="text-2xl font-extrabold tabular-nums" style={{ color: T.navy }}>{resources.length}</div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>Resources</div>
              </div>
              <div className="rounded-2xl border p-3" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                <div className="text-2xl font-extrabold tabular-nums" style={{ color: T.navy }}>{sectionCount}</div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>Sections</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 pl-2">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Section">
                <input
                  value={form.section}
                  onChange={(e) => updateField("section", e.target.value)}
                  placeholder="Emergency support"
                  className="w-full h-11 rounded-2xl border px-3 text-sm outline-none placeholder:text-[#A8ABB2]"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Title">
                <input
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Fort Bliss official site"
                  className="w-full h-11 rounded-2xl border px-3 text-sm outline-none placeholder:text-[#A8ABB2]"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Link">
                <div className="relative">
                  <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.blue }} />
                  <input
                    value={form.link}
                    onChange={(e) => updateField("link", e.target.value)}
                    placeholder="https://home.army.mil/bliss/"
                    className="w-full h-11 rounded-2xl border pl-9 pr-3 text-sm outline-none placeholder:text-[#A8ABB2]"
                    style={inputStyle()}
                  />
                </div>
              </Field>

              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Short note about what this resource helps with."
                  rows={3}
                  className="w-full rounded-2xl border px-3 py-3 text-sm outline-none resize-none placeholder:text-[#A8ABB2]"
                  style={inputStyle()}
                />
              </Field>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button type="submit" variant="primary" icon={isEditing ? Save : Plus} disabled={saving}>
                {saving ? "Saving..." : isEditing ? "Update resource" : "Add resource"}
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
              <FileText size={20} />
            </div>

            <div>
              <h3 className="text-xl font-extrabold tracking-[-0.02em]" style={{ color: T.navy }}>
                Existing resources
              </h3>
              <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
                Edit or remove links shown on the Resources page.
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
              placeholder="Search resources..."
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
            Loading resources...
          </div>
        ) : resources.length === 0 ? (
          <EmptyState icon={BookMarked} title="No resources yet" body="Add your first resource above. It will appear on the Resources page after it saves." />
        ) : filteredResources.length === 0 ? (
          <EmptyState icon={Search} title="No matching resources" body="Try searching by section, title, description, or link." />
        ) : (
          <div className="grid gap-3">
            {filteredResources.map((resource) => (
              <ResourceRow
                key={resource.id}
                resource={resource}
                onEdit={startEdit}
                onDelete={setConfirmDelete}
              />
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.title || "this resource"}?`}
        body="This removes the resource from the public Resources page. You can add it again later if needed."
        confirmText="Delete resource"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
