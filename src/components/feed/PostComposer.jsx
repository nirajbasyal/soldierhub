"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronRight, Pencil, Plus, Send, X } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";
import { moderateAsync } from "@/lib/moderation-client";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

export default function PostComposer() {
  const { currentUser, requireAuth, createPost } = useApp();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("General Q&A");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (open && ref.current) ref.current.focus();
  }, [open]);

  // Not signed in or pending — show the unverified prompt
  if (!currentUser || currentUser.status !== "verified") {
    return (
      <button
        onClick={requireAuth}
        className="w-full rounded-2xl border p-5 flex items-center gap-3 text-left transition-shadow hover:shadow-sm"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: T.goldBg }}>
          <Pencil size={16} style={{ color: T.gold }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium" style={{ color: T.text }}>Share a question or update</div>
          <div className="text-xs" style={{ color: T.textSubtle }}>Sign in as a verified member to post.</div>
        </div>
        <ChevronRight size={16} style={{ color: T.textSubtle }} />
      </button>
    );
  }

  // Collapsed prompt — using a clickable div (not <button>) because we have
  // a nested <Button>, and HTML disallows button-in-button.
  if (!open) {
    const openComposer = () => setOpen(true);
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={openComposer}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openComposer();
          }
        }}
        className="w-full rounded-2xl border p-5 flex items-center gap-3 text-left transition-shadow hover:shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: T.card,
          borderColor: T.border,
          // @ts-ignore — CSS variable for focus ring color
          "--tw-ring-color": T.navy,
        }}
      >
        <Avatar name={currentUser.full_name} color={currentUser.avatar_color} size={40} />
        <div className="flex-1">
          <div className="text-[15px]" style={{ color: T.textMuted }}>
            What&apos;s on your mind, <span style={{ color: T.text }}>{currentUser.full_name?.split(" ")[0]}</span>?
          </div>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          size="md"
          onClick={(e) => {
            // Don't double-fire — the wrapper handles the click too
            e.stopPropagation();
            openComposer();
          }}
        >
          New post
        </Button>
      </div>
    );
  }

  // Expanded composer
  const submit = async () => {
    setError("");
    if (!title.trim()) return setError("Add a title for your post.");
const mod = await moderateAsync(`${title.trim()}\n\n${body.trim()}`);    if (!mod.allowed) return setError(mod.reason);

    setSubmitting(true);
    const result = await createPost({
      title: title.trim(),
      body: body.trim(),
      category,
      anonymous,
    });
    setSubmitting(false);

    if (result?.ok === false) {
      return setError(result.error || "Could not create post. Try again.");
    }

    // Only clear and close on success
    setTitle("");
    setBody("");
    setAnonymous(false);
    setError("");
    setOpen(false);
  };

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={currentUser.full_name} color={currentUser.avatar_color} size={36} />
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: T.text }}>
            {anonymous ? "Anonymous Soldier" : currentUser.full_name}
          </div>
          <div className="text-xs" style={{ color: T.textSubtle }}>Posting to Soldier Hub</div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ color: T.textMuted }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="-mx-1 mb-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 px-1 pb-1">
          {CATEGORIES.filter((c) => c.key !== "All").map((c) => {
            const active = c.key === category;
            const s = TONE_STYLES[c.tone];
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="px-3 h-8 rounded-full text-xs font-medium border whitespace-nowrap transition-all"
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
      </div>

      <input
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title — what do you want to ask or share?"
        className="w-full text-lg font-semibold mb-2 outline-none border-0 bg-transparent placeholder:text-[#A8ABB2]"
        style={{ color: T.text }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add the details people will need to actually help…"
        rows={4}
        className="w-full resize-none outline-none text-[15px] leading-relaxed border-0 bg-transparent placeholder:text-[#A8ABB2]"
        style={{ color: T.text }}
      />

      {error && (
        <div
          className="text-xs px-3 py-2 rounded-lg flex items-start gap-2 my-3"
          style={{ backgroundColor: T.redBg, color: T.red }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div
        className="flex items-center justify-between gap-2 pt-3 mt-2 border-t"
        style={{ borderColor: T.borderSoft }}
      >
        <label
          className="flex items-center gap-2 text-sm cursor-pointer select-none"
          style={{ color: T.textMuted }}
        >
          <input type="checkbox" checked={anonymous}
                 onChange={(e) => setAnonymous(e.target.checked)}
                 className="w-4 h-4 rounded" />
          Post anonymously
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit} icon={Send} disabled={submitting}>
            {submitting ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
