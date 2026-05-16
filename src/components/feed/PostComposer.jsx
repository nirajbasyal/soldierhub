"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, Lock, Pencil, Plus, Send } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";
import { moderateAsync } from "@/lib/moderation-client";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

const RED = "#B31942";
const DARK_RED = "#9F1239";
const PUBLISH_SCROLL_KEY = "soldierhub_scroll_to_latest_post";

function getAnonymousDisplayName(seed) {
  const source = String(seed || "anonymous");
  let total = 0;

  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }

  return `Anonymous${String(total % 10000).padStart(4, "0")}`;
}

export default function PostComposer({ startOpen = false, pageMode = false }) {
  const router = useRouter();
  const {
    currentUser,
    requireAuth,
    createPost,
    setCategory: setFeedCategory,
  } = useApp();

  const [open, setOpen] = useState(startOpen);
  const [category, setCategory] = useState("General Q&A");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bodyRef = useRef(null);

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

  const selectCategory = (nextCategory) => {
    if (submitting) return;
    setCategory(nextCategory);
    focusComposerField();
  };

  const toggleAnonymous = () => {
    if (submitting) return;
    setAnonymous((value) => !value);
  };

  const closeComposer = () => {
    if (submitting) return;

    if (startOpen) {
      setBody("");
      setAnonymous(false);
      setError("");
      return;
    }

    setOpen(false);
  };

  const resetComposer = () => {
    setBody("");
    setAnonymous(false);
    setError("");
    setOpen(startOpen);
  };

  const submit = async () => {
    if (submitting) return;

    setError("");

    const cleanedBody = body.trim();

    if (!cleanedBody) {
      setError("Write something before publishing.");
      return;
    }

    try {
      setSubmitting(true);

      const mod = await moderateAsync(cleanedBody);

      if (!mod.allowed) {
        setError(mod.reason || SAFETY_MESSAGE);
        return;
      }

      const result = await createPost({
        body: cleanedBody,
        category,
        anonymous,
      });

      if (result?.ok === false) {
        setError(result.error || "Could not create post. Try again.");
        return;
      }

      resetComposer();

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PUBLISH_SCROLL_KEY, "1");
      }

      setFeedCategory?.("All");
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Could not create post. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser || currentUser.status !== "verified") {
    return (
      <button
        type="button"
        onClick={requireAuth}
        className="flex w-full items-center gap-3 rounded-[24px] border p-5 text-left"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
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
      </button>
    );
  }

  if (!open) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[26px] border p-5"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <Avatar name={currentUser.full_name} color={currentUser.avatar_color} size={46} />

        <div
          className="min-w-0 flex-1 rounded-full border px-4 py-4"
          style={{ backgroundColor: "#F4F8FD", borderColor: T.border }}
        >
          <div className="truncate text-[15px] font-medium" style={{ color: T.textMuted }}>
            What do you want to ask or share?
          </div>
        </div>

        <Button variant="primary" icon={Plus}>
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
      className={pageMode
        ? "flex min-h-[calc(100vh-178px)] flex-col rounded-[30px] border p-4 md:p-6"
        : "rounded-[26px] border p-4"
      }
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="mb-5 flex items-center gap-3">
        <Avatar name={composerDisplayName} color={composerDisplayColor} size={46} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-extrabold" style={{ color: T.text }}>
            {composerDisplayName}
          </div>
          <div className="text-sm" style={{ color: T.textSubtle }}>
            Posting to SoldierHub
          </div>
        </div>
      </div>

      <div className="relative -mx-1 mb-6">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex w-max gap-2 px-1 pr-14">
            {CATEGORIES.filter((c) => c.key !== "All").map((c) => {
              const active = c.key === category;
              const s = TONE_STYLES[c.tone];

              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => selectCategory(c.key)}
                  className="h-11 shrink-0 rounded-full border px-5 text-sm font-bold transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: active ? s.bg : "#FFFFFF",
                    color: active ? s.text : T.textMuted,
                    borderColor: active ? s.border : T.border,
                    boxShadow: active ? "0 10px 20px rgba(11,28,44,0.06)" : "none",
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-end pr-2"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.82) 62%, rgba(255,255,255,1) 100%)",
          }}
        >
          <ChevronRight size={22} strokeWidth={2.7} style={{ color: RED }} />
        </div>
      </div>

      <textarea
        ref={bodyRef}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setError("");
        }}
        disabled={submitting}
        placeholder="Ask a question, share an update, or help the Soldier Hub community..."
        rows={10}
        className="min-h-[42vh] flex-1 resize-none border-0 bg-transparent text-[20px] leading-9 outline-none placeholder:text-[#A8ABB2]"
        style={{ color: T.text }}
      />

      {error && (
        <div
          className="my-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
          style={{ backgroundColor: T.redBg, color: T.red }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        className="sticky bottom-[78px] mt-4 rounded-[26px] border p-4 backdrop-blur-xl"
        style={{
          borderColor: T.borderSoft,
          backgroundColor: "rgba(255,255,255,0.96)",
          boxShadow: "0 14px 34px rgba(11,28,44,0.08)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pr-2">
            <div className="text-sm font-extrabold" style={{ color: T.navy }}>
              Post anonymously
            </div>
            <div className="mt-1 text-xs leading-5" style={{ color: T.textSubtle }}>
              Hide your name publicly while posting safely.
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={anonymous}
            disabled={submitting}
            onClick={toggleAnonymous}
            className="relative inline-flex h-9 w-[72px] shrink-0 items-center rounded-full border"
            style={{
              borderColor: anonymous ? "rgba(159,18,57,0.18)" : T.border,
              backgroundColor: anonymous ? DARK_RED : "rgba(213,226,242,0.72)",
            }}
          >
            <span
              className="absolute left-3 text-[10px] font-black"
              style={{ color: "#FFFFFF", opacity: anonymous ? 1 : 0 }}
            >
              ON
            </span>

            <span
              className="absolute right-2.5 text-[10px] font-black"
              style={{ color: T.textSubtle, opacity: anonymous ? 0 : 1 }}
            >
              OFF
            </span>

            <span
              className="absolute left-[3px] top-[3px] h-[30px] w-[30px] rounded-full transition-transform duration-200"
              style={{
                transform: anonymous ? "translateX(36px)" : "translateX(0)",
                backgroundColor: "#FFFFFF",
              }}
            />
          </button>
        </div>

        {anonymous && (
          <div
            className="mt-3 rounded-2xl border px-3 py-2.5 text-xs"
            style={{
              backgroundColor: "rgba(255,241,245,0.96)",
              borderColor: "rgba(179,25,66,0.18)",
              color: DARK_RED,
            }}
          >
            Your name will show as {composerDisplayName}. Avoid typing personal details inside the post.
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={closeComposer}
            disabled={submitting}
            className="h-12 rounded-full border text-sm font-bold"
            style={{ backgroundColor: "#FFFFFF", borderColor: T.border, color: T.navy }}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={submitting || !body.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full text-sm font-bold"
            style={{
              backgroundColor: RED,
              color: "#FFFFFF",
              boxShadow: "0 10px 22px rgba(179,25,66,0.22)",
            }}
          >
            <Send size={16} />
            {submitting ? "Checking…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
