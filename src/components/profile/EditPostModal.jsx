"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Edit3, X } from "lucide-react";
import { T } from "@/lib/theme";
import { moderateAsync } from "@/lib/moderation-client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import FloatingWarning from "@/components/ui/FloatingWarning";
import ComposerCategoryPicker from "@/components/feed/composer/ComposerCategoryPicker";
import ComposerEditor from "@/components/feed/composer/ComposerEditor";
import ComposerToolbar from "@/components/feed/composer/ComposerToolbar";
import {
  getPlainEditorText,
  safeRequestAnimationFrame,
  sanitizeComposerHtml,
} from "@/components/feed/composer/composerUtils";

const WARNING_AUTO_HIDE_MS = 5200;

function escapePlainTextToHtml(text = "") {
  if (typeof document === "undefined") return String(text || "");

  const wrapper = document.createElement("div");
  String(text || "")
    .split("\n")
    .forEach((line, index) => {
      if (index > 0) wrapper.appendChild(document.createElement("br"));
      wrapper.appendChild(document.createTextNode(line));
    });

  return wrapper.innerHTML;
}

function looksLikeHtml(text = "") {
  return /<\/?(p|div|strong|em|ul|ol|li|br|b|i)\b/i.test(String(text || ""));
}

function preparePostBodyForEditor(body = "") {
  return looksLikeHtml(body) ? sanitizeComposerHtml(body) : escapePlainTextToHtml(body);
}

export default function EditPostModal({ post, onClose, onSave }) {
  const [category, setCategory] = useState(post.category);
  const [body, setBody] = useState(() => preparePostBodyForEditor(post.body || ""));
  const [plainText, setPlainText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeFormats, setActiveFormats] = useState({});
  const [structured, setStructured] = useState(false);

  const editorRef = useRef(null);
  const bodyRef = useRef(body);
  const plainTextRef = useRef("");
  const rejectedPlainTextRef = useRef("");
  const warningTimeoutRef = useRef(null);

  const canSave = useMemo(() => plainText.trim().length > 0, [plainText]);

  const clearWarningTimer = () => {
    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  };

  const clearError = () => {
    clearWarningTimer();
    rejectedPlainTextRef.current = "";
    setError("");
  };

  const showError = (message, { focusEditor = false } = {}) => {
    clearWarningTimer();
    rejectedPlainTextRef.current = plainTextRef.current.trim();
    setError(message || "Could not save changes.");

    if (typeof window !== "undefined") {
      warningTimeoutRef.current = window.setTimeout(clearError, WARNING_AUTO_HIDE_MS);
    }

    safeRequestAnimationFrame(() => {
      if (focusEditor) editorRef.current?.focus?.({ preventScroll: true });
    });
  };

  const syncEditorState = () => {
    const editor = editorRef.current;
    const cleanHtml = sanitizeComposerHtml(editor?.innerHTML || bodyRef.current || "");
    const cleanText = getPlainEditorText(editor) || plainTextRef.current || "";
    const isStructured = Boolean(
      editor?.hasStructuredContent?.() || cleanHtml.match(/<\/?(ul|ol|li|strong|em)\b/i)
    );

    bodyRef.current = cleanHtml;
    plainTextRef.current = cleanText;
    setBody(cleanHtml);
    setPlainText(cleanText);
    setStructured(isStructured);
    safeRequestAnimationFrame(syncFormatState);
  };

  const syncFormatState = () => {
    const nextFormats = editorRef.current?.getActiveFormats?.() || {};
    setActiveFormats(nextFormats);
  };

  useEffect(() => () => clearWarningTimer(), []);

  useEffect(() => {
    const nextBody = preparePostBodyForEditor(post.body || "");
    const plainSource = String(post.body || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    bodyRef.current = nextBody;
    plainTextRef.current = plainSource;
    setBody(nextBody);
    setPlainText(plainSource);
    setCategory(post.category);
    clearError();

    safeRequestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = nextBody;
        syncEditorState();
        editorRef.current.focus?.({ preventScroll: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  const handleEditorChange = ({ html, text, structured: nextStructured }) => {
    const cleanHtml = sanitizeComposerHtml(html || "");
    const cleanText = String(text || "").trim();

    bodyRef.current = cleanHtml;
    plainTextRef.current = cleanText;
    setBody(cleanHtml);
    setPlainText(cleanText);
    setStructured(Boolean(nextStructured));

    if (rejectedPlainTextRef.current && cleanText !== rejectedPlainTextRef.current) {
      clearError();
    }
  };

  const handleFormatChange = (nextFormats) => {
    setActiveFormats(nextFormats || {});
  };

  const applyFormatting = (action) => {
    if (submitting || !action?.command) return;
    editorRef.current?.runCommand?.(action.command);
    safeRequestAnimationFrame(syncFormatState);
  };

  const selectCategory = (nextCategory) => {
    if (submitting) return;
    setCategory(nextCategory);
    editorRef.current?.focus?.({ preventScroll: true });
  };

  const submit = async () => {
    clearError();
    syncEditorState();

    const cleanedBody = sanitizeComposerHtml(bodyRef.current).trim();
    const cleanedPlainText = plainTextRef.current.trim();

    if (!cleanedPlainText) {
      showError("Post body is required.", { focusEditor: true });
      return;
    }

    const m = await moderateAsync(cleanedPlainText);

    if (!m.allowed) {
      showError(m.reason || "This content may violate Soldier Hub community safety rules. Please revise it and try again.");
      return;
    }

    setSubmitting(true);

    const result = await onSave({
      body: cleanedBody || cleanedPlainText,
      category,
    });

    setSubmitting(false);

    if (result?.ok === false) {
      showError(result.error || "Could not save changes.");
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth={680}>
      <FloatingWarning
        message={error}
        title="Please revise this edit"
        bottomOffset="calc(env(safe-area-inset-bottom, 0px) + 6.25rem)"
      />

      <div className="relative rounded-[28px]" style={{ backgroundColor: T.card }}>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close edit post"
          className="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft, color: T.textSubtle }}
        >
          <X size={16} strokeWidth={2.7} />
        </button>

        <div className="p-4 pb-0 md:p-6 md:pb-0">
          <div
            className="mb-4 rounded-[26px] border p-4 pr-12"
            style={{
              background: "linear-gradient(135deg, rgba(238,243,247,0.98), rgba(253,254,255,0.98))",
              borderColor: T.borderSoft,
            }}
          >
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em]"
              style={{ backgroundColor: "#FFFFFF", borderColor: T.borderSoft, color: T.navy }}
            >
              <Edit3 size={14} />
              Edit post
            </div>

            <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] md:text-3xl" style={{ color: T.navy }}>
              Update your post
            </h3>

            <p className="mt-1 text-sm leading-6" style={{ color: T.textMuted }}>
              Keep the post helpful, clean, and easy to read for the Soldier Hub community.
            </p>
          </div>

          <ComposerCategoryPicker
            category={category}
            onSelectCategory={selectCategory}
            submitting={submitting}
          />

          <ComposerToolbar
            activeFormats={activeFormats}
            applyFormatting={applyFormatting}
            submitting={submitting}
          />

          <div
            className="relative rounded-[24px] border px-3 py-3 md:px-4"
            style={{ backgroundColor: "#FDFEFF", borderColor: T.borderSoft }}
          >
            <ComposerEditor
              editorRef={editorRef}
              body={body}
              plainText={plainText}
              structured={structured}
              selectedImage={null}
              imageProcessing={false}
              submitting={submitting}
              clearedDraft={null}
              pageMode={false}
              onClearText={() => {
                if (editorRef.current) editorRef.current.innerHTML = "";
                bodyRef.current = "";
                plainTextRef.current = "";
                setBody("");
                setPlainText("");
                setStructured(false);
                setActiveFormats({});
                clearError();
              }}
              onRestoreText={() => {}}
              onRemoveImage={() => {}}
              onChange={handleEditorChange}
              onFormatChange={handleFormatChange}
              onFocus={syncFormatState}
              onPointerDown={() => {}}
              onInput={syncEditorState}
              onBeforeInput={() => {}}
              onKeyDown={() => {}}
              onKeyUp={syncFormatState}
              onMouseUp={syncFormatState}
            />
          </div>
        </div>

        <div
          className="sticky bottom-0 z-20 mt-5 flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:justify-end md:px-6"
          style={{
            backgroundColor: "rgba(255,255,255,0.96)",
            borderColor: T.borderSoft,
            WebkitBackdropFilter: "blur(12px)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} icon={Check} disabled={submitting || !canSave}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
