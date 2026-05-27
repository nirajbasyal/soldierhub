"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Edit3, X } from "lucide-react";
import { T } from "@/lib/theme";
import { moderateAsync } from "@/lib/moderation-client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ComposerCategoryPicker from "@/components/feed/composer/ComposerCategoryPicker";
import ComposerEditor from "@/components/feed/composer/ComposerEditor";
import ComposerToolbar from "@/components/feed/composer/ComposerToolbar";
import {
  getPlainEditorText,
  safeRequestAnimationFrame,
  sanitizeComposerHtml,
} from "@/components/feed/composer/composerUtils";

const DEFAULT_CATEGORY = "General Q&A";

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

function getPlainTextFromBody(body = "") {
  return String(body || "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function preparePostBodyForEditor(body = "") {
  return looksLikeHtml(body) ? sanitizeComposerHtml(body) : escapePlainTextToHtml(body);
}

export default function EditPostModal({ open = false, post = {}, onClose, onSave }) {
  const safePostBody = post?.body || "";
  const safePostCategory = post?.category || DEFAULT_CATEGORY;
  const [category, setCategory] = useState(safePostCategory);
  const [body, setBody] = useState(() => preparePostBodyForEditor(safePostBody));
  const [plainText, setPlainText] = useState(() => getPlainTextFromBody(safePostBody));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeFormats, setActiveFormats] = useState({});
  const [structured, setStructured] = useState(false);

  const editorRef = useRef(null);
  const bodyRef = useRef(body);
  const plainTextRef = useRef(plainText);

  const canSave = useMemo(() => plainText.trim().length > 0, [plainText]);

  const syncFormatState = () => {
    const nextFormats = editorRef.current?.getActiveFormats?.() || {};
    setActiveFormats(nextFormats);
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
    setError("");
    safeRequestAnimationFrame(syncFormatState);

    return { cleanHtml, cleanText };
  };

  useEffect(() => {
    if (!open) return;

    const nextBody = preparePostBodyForEditor(post?.body || "");
    const plainSource = getPlainTextFromBody(post?.body || "");

    bodyRef.current = nextBody;
    plainTextRef.current = plainSource;
    setBody(nextBody);
    setPlainText(plainSource);
    setCategory(post?.category || DEFAULT_CATEGORY);
    setStructured(Boolean(nextBody.match(/<\/?(ul|ol|li|strong|em)\b/i)));
    setSubmitting(false);
    setError("");
    setActiveFormats({});

    safeRequestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = nextBody;
        syncEditorState();
        editorRef.current.focus?.({ preventScroll: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, post?.id]);

  const handleEditorChange = ({ html, text, structured: nextStructured }) => {
    const cleanHtml = sanitizeComposerHtml(html || "");
    const cleanText = String(text || "").trim();

    bodyRef.current = cleanHtml;
    plainTextRef.current = cleanText;
    setBody(cleanHtml);
    setPlainText(cleanText);
    setStructured(Boolean(nextStructured));
    setError("");
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
    if (submitting) return;

    setError("");
    const { cleanHtml, cleanText } = syncEditorState();
    const cleanedBody = sanitizeComposerHtml(cleanHtml).trim();
    const cleanedPlainText = cleanText.trim();

    if (!cleanedPlainText) {
      setError("Post body is required.");
      editorRef.current?.focus?.({ preventScroll: true });
      return;
    }

    setSubmitting(true);

    try {
      const m = await moderateAsync(cleanedPlainText);

      if (!m.allowed) {
        setError(m.reason || "This post could not be saved.");
        editorRef.current?.focus?.({ preventScroll: true });
        return;
      }

      if (typeof onSave !== "function") {
        setError("Post save action is not available. Please refresh and try again.");
        return;
      }

      const result = await onSave({
        body: cleanedBody || cleanedPlainText,
        category,
      });

      if (result?.ok === false) {
        setError(result.error || "Could not save changes.");
      }
    } catch (saveError) {
      setError(saveError?.message || "Could not save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={Boolean(open)} onClose={submitting ? () => {} : onClose} maxWidth={680}>
      <div className="relative overflow-hidden rounded-[28px]" style={{ backgroundColor: T.card }}>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close edit post"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft, color: T.textSubtle }}
        >
          <X size={16} strokeWidth={2.7} />
        </button>

        <div className="p-4 md:p-6">
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

          {error && (
            <div
              className="mt-3 flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs"
              style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={submit} icon={Check} disabled={submitting || !canSave}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
