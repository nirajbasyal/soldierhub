"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Lock,
  Pencil,
  Plus,
  Send,
  X,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";
import { moderateAsync } from "@/lib/moderation-client";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

function createDraftPostId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getAnonymousDisplayName(postId) {
  const source = String(postId || "anonymous");
  let total = 0;

  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }

  const number = String(total % 10000).padStart(4, "0");

  return `Anonymous${number}`;
}

export default function PostComposer() {
  const { currentUser, requireAuth, createPost } = useApp();

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("General Q&A");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [draftPostId, setDraftPostId] = useState(() => createDraftPostId());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ref = useRef(null);

  useEffect(() => {
    if (open && ref.current) {
      ref.current.focus();
    }
  }, [open]);

  const closeComposer = () => {
    if (submitting) return;

    setOpen(false);
    setError("");
  };

  const resetComposer = () => {
    setTitle("");
    setBody("");
    setAnonymous(false);
    setDraftPostId(createDraftPostId());
    setError("");
    setOpen(false);
  };

  const submit = async () => {
    if (submitting) return;

    setError("");

    const cleanedTitle = title.trim();
    const cleanedBody = body.trim();

    if (!cleanedTitle) {
      return setError("Add a title for your post.");
    }

    try {
      setSubmitting(true);

      const mod = await moderateAsync(`${cleanedTitle}\n\n${cleanedBody}`);

      if (!mod.allowed) {
        setSubmitting(false);
        return setError(mod.reason || SAFETY_MESSAGE);
      }

      const result = await createPost({
        id: draftPostId,
        title: cleanedTitle,
        body: cleanedBody,
        category,
        anonymous,
      });

      setSubmitting(false);

      if (result?.ok === false) {
        return setError(result.error || "Could not create post. Try again.");
      }

      resetComposer();
    } catch (err) {
      console.error("Post submit failed:", err);
      setSubmitting(false);
      setError("Could not create post. Try again.");
    }
  };

  // Not signed in or pending — show the unverified prompt
  if (!currentUser || currentUser.status !== "verified") {
    return (
      <button
        type="button"
        onClick={requireAuth}
        className="w-full rounded-2xl border p-5 flex items-center gap-3 text-left transition-shadow hover:shadow-sm"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: T.goldBg }}
        >
          <Pencil size={16} style={{ color: T.gold }} />
        </div>

        <div className="flex-1">
          <div className="text-sm font-medium" style={{ color: T.text }}>
            Share a question or update
          </div>

          <div className="text-xs" style={{ color: T.textSubtle }}>
            Sign in as a verified member to post.
          </div>
        </div>

        <ChevronRight size={16} style={{ color: T.textSubtle }} />
      </button>
    );
  }

  // Collapsed prompt
  if (!open) {
    const openComposer = () => {
      setError("");
      setOpen(true);
    };

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
          "--tw-ring-color": T.navy,
        }}
      >
        <Avatar
          name={currentUser.full_name}
          color={currentUser.avatar_color}
          size={40}
        />

        <div className="flex-1 min-w-0">
          <div className="text-[15px] truncate" style={{ color: T.textMuted }}>
            What&apos;s on your mind,{" "}
            <span style={{ color: T.text }}>
              {currentUser.full_name?.split(" ")[0]}
            </span>
            ?
          </div>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          size="md"
          onClick={(e) => {
            e.stopPropagation();
            openComposer();
          }}
        >
          New post
        </Button>
      </div>
    );
  }

  const composerDisplayName = anonymous
    ? getAnonymousDisplayName(draftPostId)
    : currentUser.full_name;

  const composerDisplayColor = anonymous ? "#5C6470" : currentUser.avatar_color;

  // Expanded composer
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={composerDisplayName} color={composerDisplayColor} size={36} />

        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-semibold truncate flex items-center gap-1.5"
            style={{ color: T.text }}
          >
            {anonymous && <Lock size={12} strokeWidth={2.5} />}
            <span>{composerDisplayName}</span>
          </div>

          <div className="text-xs" style={{ color: T.textSubtle }}>
            {anonymous
              ? "Posting anonymously to SoldierHub"
              : "Posting to SoldierHub"}
          </div>
        </div>

        <button
          type="button"
          onClick={closeComposer}
          disabled={submitting}
          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-50"
          style={{ color: T.textMuted }}
          aria-label="Close post composer"
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
                type="button"
                onClick={() => setCategory(c.key)}
                disabled={submitting}
                className="px-3 h-8 rounded-full text-xs font-medium border whitespace-nowrap transition-all disabled:opacity-60"
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
        onChange={(e) => {
          setTitle(e.target.value);
          setError("");
        }}
        disabled={submitting}
        placeholder="Title — what do you want to ask or share?"
        className="w-full text-lg font-semibold mb-2 outline-none border-0 bg-transparent placeholder:text-[#A8ABB2] disabled:opacity-70"
        style={{ color: T.text }}
      />

      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setError("");
        }}
        disabled={submitting}
        placeholder="Add the details people will need to actually help…"
        rows={4}
        className="w-full resize-none outline-none text-[15px] leading-relaxed border-0 bg-transparent placeholder:text-[#A8ABB2] disabled:opacity-70"
        style={{ color: T.text }}
      />

      {anonymous && (
        <div
          className="text-xs px-3 py-2 rounded-lg flex items-start gap-2 my-3"
          style={{ backgroundColor: T.goldBg, color: T.gold }}
        >
          <Lock size={14} className="shrink-0 mt-0.5" />
          <span>
            Your name will be hidden publicly as {composerDisplayName}. Avoid
            typing details that identify you inside the post.
          </span>
        </div>
      )}

      {error && (
        <div
          className="text-xs px-3 py-2 rounded-lg flex items-start gap-2 my-3"
          style={{ backgroundColor: T.redBg, color: T.red }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
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
          <input
            type="checkbox"
            checked={anonymous}
            disabled={submitting}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Post anonymously
        </label>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={closeComposer} disabled={submitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={submit}
            icon={Send}
            disabled={submitting || !title.trim()}
          >
            {submitting ? "Checking…" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}