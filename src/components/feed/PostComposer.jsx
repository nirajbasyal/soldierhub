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

function getAnonymousDisplayName(seed) {
  const source = String(seed || "anonymous");
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
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bodyRef = useRef(null);
  const anonymousToggleAtRef = useRef(0);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.focus();
    }
  }, [open]);

  const focusComposerField = () => {
    window.requestAnimationFrame(() => {
      bodyRef.current?.focus({ preventScroll: true });
    });
  };

  const keepComposerKeyboardOpen = () => {
    bodyRef.current?.focus({ preventScroll: true });

    window.requestAnimationFrame(() => {
      bodyRef.current?.focus({ preventScroll: true });
    });

    window.setTimeout(() => {
      bodyRef.current?.focus({ preventScroll: true });
    }, 60);
  };

  const selectCategory = (nextCategory) => {
    if (submitting) return;

    setCategory(nextCategory);
    focusComposerField();
  };

  const toggleAnonymousWithoutBlur = (event) => {
    if (submitting) return;

    event?.preventDefault?.();
    event?.stopPropagation?.();

    const now = Date.now();
    if (now - anonymousToggleAtRef.current < 250) return;
    anonymousToggleAtRef.current = now;

    bodyRef.current?.focus({ preventScroll: true });
    setAnonymous((value) => !value);
    keepComposerKeyboardOpen();
  };

  const closeComposer = () => {
    if (submitting) return;

    setOpen(false);
    setError("");
  };

  const resetComposer = () => {
    setBody("");
    setAnonymous(false);
    setError("");
    setOpen(false);
  };

  const submit = async () => {
    if (submitting) return;

    setError("");

    const cleanedBody = body.trim();

    if (!cleanedBody) {
      return setError("Write something before publishing.");
    }

    try {
      setSubmitting(true);

      const mod = await moderateAsync(cleanedBody);

      if (!mod.allowed) {
        setSubmitting(false);
        return setError(mod.reason || SAFETY_MESSAGE);
      }

      const result = await createPost({
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

  if (!currentUser || currentUser.status !== "verified") {
    return (
      <button
        type="button"
        onClick={requireAuth}
        className="w-full rounded-[24px] border p-5 flex items-center gap-3 text-left transition-shadow hover:shadow-sm"
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
        className="w-full rounded-[26px] border p-5 md:p-6 flex items-center gap-3.5 text-left transition-all hover:shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: T.card,
          borderColor: T.border,
          "--tw-ring-color": T.navy,
        }}
      >
        <Avatar
          name={currentUser.full_name}
          color={currentUser.avatar_color}
          size={46}
        />

        <div
          className="flex-1 min-w-0 rounded-full border px-4 py-4"
          style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft || T.border }}
        >
          <div className="text-[15px] md:text-[16px] truncate font-medium" style={{ color: T.textMuted }}>
            What do you want to ask or share?
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
          Post
        </Button>
      </div>
    );
  }

  const composerDisplayName = anonymous
    ? getAnonymousDisplayName(currentUser.id)
    : currentUser.full_name;

  const composerDisplayColor = anonymous ? "#5C6470" : currentUser.avatar_color;

  return (
    <div
      className="rounded-[26px] border p-4 md:p-5 shadow-sm"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={composerDisplayName} color={composerDisplayColor} size={38} />

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
          className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 transition hover:bg-black/[0.04]"
          style={{ color: T.textMuted }}
          aria-label="Close post composer"
        >
          <X size={17} />
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectCategory(c.key);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  selectCategory(c.key);
                }}
                onClick={(e) => {
                  e.preventDefault();
                }}
                disabled={submitting}
                className="px-3 h-8 rounded-full text-xs font-medium border whitespace-nowrap transition-all disabled:opacity-60"
                style={{
                  backgroundColor: active ? s.bg : T.card,
                  color: active ? s.text : T.textMuted,
                  borderColor: active ? s.border : T.border,
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setError("");
        }}
        disabled={submitting}
        placeholder="Ask a question, share an update, or help the Fort Bliss community..."
        rows={5}
        className="w-full resize-none outline-none text-[17px] md:text-[18px] leading-8 border-0 bg-transparent placeholder:text-[#A8ABB2] disabled:opacity-70"
        style={{ color: T.text }}
      />

      {anonymous && (
        <div
          className="text-xs px-3 py-2 rounded-xl flex items-start gap-2 my-3"
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
          className="text-xs px-3 py-2 rounded-xl flex items-start gap-2 my-3"
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
        <button
          type="button"
          aria-pressed={anonymous}
          disabled={submitting}
          onPointerDown={toggleAnonymousWithoutBlur}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className="flex items-center gap-2 text-sm cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            color: anonymous ? T.text : T.textMuted,
            WebkitTapHighlightColor: "transparent",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          <span
            className="w-4 h-4 rounded border flex items-center justify-center text-[11px] font-bold leading-none"
            style={{
              backgroundColor: anonymous ? T.navy : T.card,
              borderColor: anonymous ? T.navy : T.border,
              color: "#FFFFFF",
            }}
            aria-hidden="true"
          >
            {anonymous ? "✓" : ""}
          </span>
          Post anonymously
        </button>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={closeComposer} disabled={submitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={submit}
            icon={Send}
            disabled={submitting || !body.trim()}
          >
            {submitting ? "Checking…" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
