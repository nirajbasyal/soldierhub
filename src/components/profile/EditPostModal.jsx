"use client";

import { useState } from "react";
import { AlertTriangle, Check, Edit3 } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";
import { moderateAsync } from "@/lib/moderation-client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";

export default function EditPostModal({ post, onClose, onSave }) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [category, setCategory] = useState(post.category);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError("");

    if (!title.trim()) return setError("Title is required.");

    const m = await moderateAsync(`${title} ${body}`);

    if (!m.allowed) return setError(m.reason);

    setSubmitting(true);

    const result = await onSave({
      title: title.trim(),
      body: body.trim(),
      category,
    });

    setSubmitting(false);

    if (result?.ok === false) {
      setError(result.error || "Could not save changes.");
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth={640}>
      <div
        className="relative overflow-hidden rounded-[28px]"
        style={{ backgroundColor: T.card }}
      >
        <div
          className="absolute left-0 top-0 h-full w-1.5"
          style={{ backgroundColor: "#B31942" }}
        />
        <div
          className="absolute right-0 top-0 h-full w-1.5"
          style={{ backgroundColor: "#1E4E8C" }}
        />

        <div className="p-5 md:p-6">
          <div
            className="rounded-3xl border p-4 mb-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(220,232,247,0.95), rgba(253,254,255,0.98), rgba(253,236,240,0.72))",
              borderColor: "#D5E2F2",
            }}
          >
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]"
              style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2", color: T.blue }}
            >
              <Edit3 size={14} />
              Edit post
            </div>

            <h3 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-[-0.03em]" style={{ color: T.navy }}>
              Update your post
            </h3>

            <p className="mt-1 text-sm leading-6" style={{ color: T.textMuted }}>
              Keep the title clear and the body helpful for the SoldierHub community.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {CATEGORIES.filter((c) => c.key !== "All").map((c) => {
              const active = c.key === category;
              const s = TONE_STYLES[c.tone];

              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className="px-3 h-8 rounded-full text-xs font-bold border transition hover:-translate-y-0.5"
                  style={{
                    backgroundColor: active ? s.bg : "rgba(244,248,253,0.95)",
                    color: active ? s.text : T.textMuted,
                    borderColor: active ? s.border : "#D5E2F2",
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3">
            <TextInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextArea label="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={7} />
          </div>

          {error && (
            <div
              className="text-xs px-3 py-2 rounded-2xl flex items-start gap-2 mt-3 border"
              style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-5">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} icon={Check} disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
