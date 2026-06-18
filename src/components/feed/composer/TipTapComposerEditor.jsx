"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Loader2, X } from "lucide-react";
import { T } from "@/lib/theme";
import { EDITOR_CLASSNAME, sanitizeComposerHtml } from "./composerUtils";

const PLACEHOLDER = "Ask, share, or help the Fort Bliss community.";

function isEmptyHtml(html = "") {
  return !String(html || "")
    .replace(/<p><\/p>|<p><br><\/p>|<br\s*\/?/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function escapePlainText(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

function hasStructuredContent(editor) {
  return Boolean(editor?.isActive("bulletList") || editor?.isActive("orderedList") || editor?.getHTML?.().match(/<\/?(ul|ol|li|strong|em)\b/i));
}

export default function TipTapComposerEditor({
  editorRef,
  body,
  selectedImage,
  imageProcessing,
  submitting,
  pageMode = false,
  onRemoveImage,
  onChange,
  onFormatChange,
}) {
  const selectedImageAspectRatio = selectedImage?.width && selectedImage?.height ? `${selectedImage.width} / ${selectedImage.height}` : "16 / 10";
  const [mounted, setMounted] = useState(false);
  const savedSelectionRef = useRef(null);
  const manualInlineFormatsRef = useRef({ bold: false, italic: false });

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        strike: false,
      }),
      Placeholder.configure({ placeholder: PLACEHOLDER, emptyEditorClass: "is-editor-empty" }),
    ],
    []
  );

  const emitContent = useCallback(
    (tiptap) => {
      const html = sanitizeComposerHtml(tiptap?.getHTML?.() || "");
      const text = tiptap?.getText?.("\n")?.replace(/ /g, " ").trim() || "";
      onChange?.({ html: isEmptyHtml(html) ? "" : html, text, structured: hasStructuredContent(tiptap) });
    },
    [onChange]
  );

  const rememberSelection = useCallback((tiptap) => {
    const selection = tiptap?.state?.selection;
    if (!selection) return;
    savedSelectionRef.current = { from: selection.from, to: selection.to };
  }, []);

  const getDisplayFormats = useCallback((tiptap) => {
    return {
      bold: Boolean(tiptap?.isActive("bold") || manualInlineFormatsRef.current.bold),
      italic: Boolean(tiptap?.isActive("italic") || manualInlineFormatsRef.current.italic),
      bullet: Boolean(tiptap?.isActive("bulletList")),
      number: Boolean(tiptap?.isActive("orderedList")),
    };
  }, []);

  const syncFormats = useCallback(
    (tiptap) => {
      onFormatChange?.(getDisplayFormats(tiptap));
    },
    [getDisplayFormats, onFormatChange]
  );

  const applyStoredMarks = useCallback((tiptap) => {
    if (!tiptap?.state || !tiptap?.view) return;
    const marks = [];
    if (manualInlineFormatsRef.current.bold && tiptap.state.schema.marks.bold) marks.push(tiptap.state.schema.marks.bold.create());
    if (manualInlineFormatsRef.current.italic && tiptap.state.schema.marks.italic) marks.push(tiptap.state.schema.marks.italic.create());
    tiptap.view.dispatch(tiptap.state.tr.setStoredMarks(marks));
  }, []);

  const editor = useEditor({
    extensions,
    content: body || "",
    editable: mounted && !submitting,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${EDITOR_CLASSNAME} focus:outline-none`,
        role: "textbox",
        "aria-label": "Write your Soldier Hub post",
        "aria-multiline": "true",
      },
      transformPastedHTML(html) {
        return sanitizeComposerHtml(html || "");
      },
      transformPastedText(text) {
        return String(text || "");
      },
    },
    onCreate({ editor: tiptap }) {
      rememberSelection(tiptap);
      syncFormats(tiptap);
    },
    onUpdate({ editor: tiptap }) {
      rememberSelection(tiptap);
      applyStoredMarks(tiptap);
      emitContent(tiptap);
      syncFormats(tiptap);
    },
    onSelectionUpdate({ editor: tiptap }) {
      rememberSelection(tiptap);
      syncFormats(tiptap);
    },
    onFocus({ editor: tiptap }) {
      rememberSelection(tiptap);
      applyStoredMarks(tiptap);
      syncFormats(tiptap);
    },
    onBlur({ editor: tiptap }) {
      rememberSelection(tiptap);
    },
  });

  const handleRemoveImage = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      onRemoveImage?.();
    },
    [onRemoveImage]
  );

  const focusEditorAtEnd = useCallback(
    (tiptap) => {
      if (!tiptap) return;
      const endPosition = Math.max(0, tiptap.state?.doc?.content?.size ?? 0);
      tiptap.commands.setTextSelection(endPosition);
      tiptap.commands.focus(undefined, { scrollIntoView: true });
      applyStoredMarks(tiptap);
      rememberSelection(tiptap);
      syncFormats(tiptap);
    },
    [applyStoredMarks, rememberSelection, syncFormats]
  );

  const runFormatCommand = useCallback(
    (command) => {
      if (!editor || submitting) return;

      const docSize = editor.state.doc.content.size;
      const from = Math.max(0, Math.min(savedSelectionRef.current?.from ?? editor.state.selection.from, docSize));
      const to = Math.max(0, Math.min(savedSelectionRef.current?.to ?? editor.state.selection.to, docSize));

      editor.commands.focus(undefined, { scrollIntoView: false });
      editor.commands.setTextSelection({ from, to });

      if (command === "bold") {
        const selectedBold = from !== to ? editor.isActive("bold") : manualInlineFormatsRef.current.bold;
        const nextBold = !selectedBold;
        manualInlineFormatsRef.current = { ...manualInlineFormatsRef.current, bold: nextBold };
        nextBold ? editor.commands.setBold() : editor.commands.unsetBold();
        applyStoredMarks(editor);
      }

      if (command === "italic") {
        const selectedItalic = from !== to ? editor.isActive("italic") : manualInlineFormatsRef.current.italic;
        const nextItalic = !selectedItalic;
        manualInlineFormatsRef.current = { ...manualInlineFormatsRef.current, italic: nextItalic };
        nextItalic ? editor.commands.setItalic() : editor.commands.unsetItalic();
        applyStoredMarks(editor);
      }

      if (command === "insertUnorderedList") editor.commands.toggleBulletList();
      if (command === "insertOrderedList") editor.commands.toggleOrderedList();

      rememberSelection(editor);
      syncFormats(editor);
      emitContent(editor);
    },
    [applyStoredMarks, editor, emitContent, rememberSelection, submitting, syncFormats]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    editor?.setEditable(mounted && !submitting);
  }, [editor, mounted, submitting]);

  useEffect(() => {
    if (!mounted || !editor || editor.isFocused) return;
    const currentHtml = sanitizeComposerHtml(editor.getHTML());
    const nextHtml = sanitizeComposerHtml(body || "");
    if (nextHtml !== currentHtml) editor.commands.setContent(nextHtml || "", false);
  }, [body, editor, mounted]);

  useImperativeHandle(
    editorRef,
    () => ({
      focus: () => editor?.commands.focus(undefined, { scrollIntoView: false }),
      focusEnd: () => focusEditorAtEnd(editor),
      get innerHTML() {
        return editor ? sanitizeComposerHtml(editor.getHTML()) : "";
      },
      set innerHTML(value) {
        editor?.commands.setContent(sanitizeComposerHtml(value || ""), false);
        window.requestAnimationFrame?.(() => emitContent(editor));
      },
      get textContent() {
        return editor?.getText("\n") || "";
      },
      set textContent(value) {
        const clean = escapePlainText(value || "");
        editor?.commands.setContent(clean ? `<p>${clean}</p>` : "", false);
        window.requestAnimationFrame?.(() => emitContent(editor));
      },
      get innerText() {
        return editor?.getText("\n") || "";
      },
      style: {},
      querySelector: (selector) => editor?.view?.dom?.querySelector?.(selector) || null,
      hasStructuredContent: () => hasStructuredContent(editor),
      getActiveFormats: () => getDisplayFormats(editor),
      getHTML: () => (editor ? sanitizeComposerHtml(editor.getHTML()) : ""),
      getText: () => editor?.getText("\n") || "",
      runCommand: runFormatCommand,
      blur: () => editor?.commands.blur(),
    }),
    [editor, emitContent, focusEditorAtEnd, getDisplayFormats, runFormatCommand]
  );

  const editorContent = mounted ? <EditorContent editor={editor} /> : <div className={`${EDITOR_CLASSNAME} ProseMirror`} aria-hidden="true" />;

  return (
    <div
      className="soldierhub-normal-editor relative"
      data-page-mode={pageMode ? "true" : "false"}
      suppressHydrationWarning
    >
      <div
        className="soldierhub-editor-surface rounded-2xl border px-3.5 py-3"
        style={{ backgroundColor: T.surfaceSoft, borderColor: T.borderSoft }}
      >
        {editorContent}
      </div>

      {imageProcessing && !selectedImage ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border px-3.5 py-3" style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft }}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(63,95,125,0.12)", color: T.navy }}>
            <Loader2 size={17} className="animate-spin" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold" style={{ color: T.text }}>Preparing your photo</div>
            <div className="text-xs font-medium" style={{ color: T.textSubtle }}>Please wait before publishing.</div>
          </div>
        </div>
      ) : null}

      {selectedImage ? (
        <div className="mt-3 overflow-hidden rounded-2xl border" style={{ backgroundColor: "#EEF3F8", borderColor: T.borderSoft }}>
          <div className="relative flex justify-center bg-[#EEF3F8]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview URL, next/image not applicable */}
            <img src={selectedImage.previewUrl} alt="Selected post preview" className="block max-h-[40vh] w-full object-cover md:max-h-[340px]" style={{ aspectRatio: selectedImageAspectRatio }} />
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={submitting || imageProcessing}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: "rgba(255,255,255,0.94)", borderColor: T.border, color: T.navy }}
              aria-label="Remove selected photo"
              title="Remove photo"
            >
              <X size={16} strokeWidth={2.8} />
            </button>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .soldierhub-editor-surface { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .soldierhub-editor-surface:focus-within { border-color: rgba(30,78,140,0.45) !important; box-shadow: 0 0 0 3px rgba(30,78,140,0.08); }
        .soldierhub-normal-editor .ProseMirror { width: 100%; min-height: 150px; max-height: 340px; margin: 0 !important; padding: 0 !important; color: ${T.text}; background: transparent !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; outline: 0 !important; white-space: pre-wrap; overflow-wrap: anywhere; overflow-y: auto; -webkit-overflow-scrolling: touch; cursor: text; caret-color: auto; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: rgba(63,95,125,0.24) transparent; }
        .soldierhub-normal-editor[data-page-mode="true"] .ProseMirror { min-height: 220px; max-height: 52vh; }
        .soldierhub-normal-editor .ProseMirror::-webkit-scrollbar { width: 6px; }
        .soldierhub-normal-editor .ProseMirror::-webkit-scrollbar-track { background: transparent; }
        .soldierhub-normal-editor .ProseMirror::-webkit-scrollbar-thumb { background-color: rgba(63,95,125,0.22); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
        .soldierhub-normal-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #a8abb2; pointer-events: none; height: 0; }
      `}</style>
    </div>
  );
}
