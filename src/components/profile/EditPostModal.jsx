"use client";
import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
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
    const result = await onSave({ title: title.trim(), body: body.trim(), category });
    setSubmitting(false);
    if (result?.ok === false) {
      setError(result.error || "Could not save changes.");
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth={560}>
      <div className="p-6">
        <h3 className="text-2xl mb-4 font-serif" style={{ color: T.navy }}>Edit post</h3>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {CATEGORIES.filter((c) => c.key !== "All").map((c) => {
            const active = c.key === category;
            const s = TONE_STYLES[c.tone];
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="px-3 h-8 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: active ? s.bg : T.card,
                  color: active ? s.text : T.textMuted,
                  borderColor: active ? s.border : T.border,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="h-3" />
        <TextArea label="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} />

        {error && (
          <div
            className="text-xs px-3 py-2 rounded-lg flex items-start gap-2 mt-3"
            style={{ backgroundColor: T.redBg, color: T.red }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={submit} icon={Check} disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
