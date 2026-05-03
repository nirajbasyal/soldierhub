"use client";

import { useEffect, useState } from "react";
import { Edit3, ExternalLink, Plus, Save, Trash2, X } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import {
  adminCreateResource,
  adminDeleteResource,
  adminUpdateResource,
  listResources,
} from "@/lib/db/resources";
import Button from "@/components/ui/Button";

const EMPTY_FORM = {
  section: "",
  title: "",
  description: "",
  link: "",
};

export default function ResourceManager() {
  const { pushToast } = useApp();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const isEditing = Boolean(editingId);

  const loadResources = async () => {
    setLoading(true);

    const { data, error } = await listResources();

    if (error) {
      pushToast(error.message || "Could not load resources.", "error");
      setLoading(false);
      return;
    }

    setResources(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadResources();
  }, []);

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
      section: form.section,
      title: form.title,
      description: form.description,
      link: form.link,
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

  const handleDelete = async (resource) => {
    const confirmed = window.confirm(
      `Delete "${resource.title}" from resources?`
    );

    if (!confirmed) return;

    const { error } = await adminDeleteResource(resource.id);

    if (error) {
      pushToast(error.message || "Could not delete resource.", "error");
      return;
    }

    pushToast("Resource deleted", "info");
    loadResources();

    if (editingId === resource.id) {
      resetForm();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border p-4"
        style={{ backgroundColor: T.surface, borderColor: T.border }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: T.navy }}>
              Resource Manager
            </h2>
            <p className="text-sm mt-1" style={{ color: T.textMuted }}>
              Add, update, or delete resources shown on the Resources tab.
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="h-9 w-9 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                color: T.textMuted,
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="grid gap-3">
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: T.textSubtle }}
            >
              Section
            </label>
            <input
              value={form.section}
              onChange={(e) => updateField("section", e.target.value)}
              placeholder="On-post essentials"
              className="mt-1 w-full h-11 rounded-xl border px-3 text-sm outline-none"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                color: T.text,
              }}
            />
          </div>

          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: T.textSubtle }}
            >
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Fort Bliss official site"
              className="mt-1 w-full h-11 rounded-xl border px-3 text-sm outline-none"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                color: T.text,
              }}
            />
          </div>

          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: T.textSubtle }}
            >
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Garrison news, events, and policy updates."
              rows={3}
              className="mt-1 w-full rounded-xl border px-3 py-3 text-sm outline-none resize-none"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                color: T.text,
              }}
            />
          </div>

          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: T.textSubtle }}
            >
              Link
            </label>
            <input
              value={form.link}
              onChange={(e) => updateField("link", e.target.value)}
              placeholder="https://home.army.mil/bliss/"
              className="mt-1 w-full h-11 rounded-xl border px-3 text-sm outline-none"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                color: T.text,
              }}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            icon={isEditing ? Save : Plus}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : isEditing
              ? "Update Resource"
              : "Add Resource"}
          </Button>
        </div>
      </form>

      <div
        className="rounded-2xl border p-4"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: T.text }}>
            Existing resources
          </h3>
          <span className="text-xs" style={{ color: T.textSubtle }}>
            {resources.length} total
          </span>
        </div>

        {loading ? (
          <div className="text-sm" style={{ color: T.textMuted }}>
            Loading resources...
          </div>
        ) : resources.length === 0 ? (
          <div
            className="rounded-xl border p-4 text-sm"
            style={{
              backgroundColor: T.surface,
              borderColor: T.border,
              color: T.textMuted,
            }}
          >
            No resources yet. Add your first resource above.
          </div>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: T.border }}>
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: T.text }}
                  >
                    {resource.title}
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: T.textSubtle }}
                  >
                    {resource.section}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-lg border flex items-center justify-center"
                    style={{
                      borderColor: T.border,
                      backgroundColor: T.surface,
                      color: T.textMuted,
                    }}
                    title="Open link"
                  >
                    <ExternalLink size={14} />
                  </a>

                  <button
                    type="button"
                    onClick={() => startEdit(resource)}
                    className="h-8 w-8 rounded-lg border flex items-center justify-center"
                    style={{
                      borderColor: T.border,
                      backgroundColor: T.surface,
                      color: T.navy,
                    }}
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(resource)}
                    className="h-8 w-8 rounded-lg border flex items-center justify-center"
                    style={{
                      borderColor: T.border,
                      backgroundColor: T.dangerBg,
                      color: T.danger,
                    }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}