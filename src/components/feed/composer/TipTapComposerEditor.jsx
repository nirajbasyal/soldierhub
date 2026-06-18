"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Loader2, Maximize2, X } from "lucide-react";
import { T } from "@/lib/theme";
import { EDITOR_CLASSNAME, sanitizeComposerHtml } from "./composerUtils";
import MobileTextEditorOverlay from "./MobileTextEditorOverlay";

const PLACEHOLDER = "Ask, share, or help the Fort Bliss community.";

// Keep the caret comfortably away from the edges so ProseMirror's native
// scroll-into-view keeps it above the on-screen keyboard without manual math.
const SCROLL_MARGIN = { top: 28, right: 0, bottom: 56, left: 0 };
const SCROLL_THRESHOLD = { top: 28, right: 0, bottom: 56, left: 0 };

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

function isTextEditorTarget(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-composer-media='true']")) return false;
  return Boolean(target.closest(".soldierhub-normal-editor .ProseMirror"));
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
  const [writingModeOpen, setWritingModeOpen] = useState(false);
  const [phoneScreen, setPhoneScreen] = useState(false);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, bullet: false, number: false });
  const savedSelectionRef = useRef(null);
  const manualInlineFormatsRef = useRef({ bold: false, italic: false });
  const phoneScreenRef = useRef(false);
  const writingModeOpenRef = useRef(false);
  const suppressOpenUntilRef = useRef(0);
  const compactTapStartRef = useRef({ x: 0, y: 0, started: false });

  // The full-screen editor is only used on phones while composing on the page.
  const usesMobilePreview = pageMode && phoneScreen && !writingModeOpen;

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
      const text = tiptap?.getText?.("\n")?.replace(/ /g, " ").trim() || "";
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
      const next = getDisplayFormats(tiptap);
      setActiveFormats((current) => {
        const same = current.bold === next.bold && current.italic === next.italic && current.bullet === next.bullet && current.number === next.number;
        return same ? current : next;
      });
      onFormatChange?.(next);
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

  // Bring the caret into view using ProseMirror's own (battle-tested) scroll
  // logic. No manual coordinate math, so there is nothing to fight with and
  // no jumping.
  const scrollCaretIntoView = useCallback((tiptap) => {
    if (!tiptap?.view) return;
    window.requestAnimationFrame?.(() => {
      try {
        tiptap.view.dispatch(tiptap.state.tr.scrollIntoView());
      } catch {
        /* editor may have been torn down */
      }
    });
  }, []);

  const editor = useEditor({
    extensions,
    content: body || "",
    editable: mounted && !submitting,
    immediatelyRender: false,
    editorProps: {
      scrollThreshold: SCROLL_THRESHOLD,
      scrollMargin: SCROLL_MARGIN,
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
      scrollCaretIntoView(tiptap);
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

  // Move the caret to the very end and focus. Mobile browsers reset the DOM
  // selection to the start when the editor is re-attached into the overlay and
  // again when the keyboard animates in, so we re-assert "end" a few times.
  const placeCaretAtEnd = useCallback(
    (tiptap) => {
      if (!tiptap) return;
      const moveToEnd = () => {
        if (!tiptap?.view) return;
        tiptap.commands.focus("end", { scrollIntoView: true });
        applyStoredMarks(tiptap);
        rememberSelection(tiptap);
        syncFormats(tiptap);
        scrollCaretIntoView(tiptap);
      };
      moveToEnd();
      window.requestAnimationFrame?.(moveToEnd);
      window.setTimeout(moveToEnd, 90);
      window.setTimeout(moveToEnd, 240);
    },
    [applyStoredMarks, rememberSelection, scrollCaretIntoView, syncFormats]
  );

  const handleRemoveImage = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      suppressOpenUntilRef.current = Date.now() + 600;
      onRemoveImage?.();
    },
    [onRemoveImage]
  );

  const openWritingMode = useCallback(() => {
    if (!mounted || !pageMode || !phoneScreenRef.current || submitting) return;
    if (Date.now() < suppressOpenUntilRef.current) return;
    if (editor) rememberSelection(editor);
    setWritingModeOpen(true);
  }, [editor, mounted, pageMode, rememberSelection, submitting]);

  const closeWritingMode = useCallback(() => {
    suppressOpenUntilRef.current = Date.now() + 500;
    emitContent(editor);
    editor?.commands.blur();
    setWritingModeOpen(false);
  }, [editor, emitContent]);

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

  const handleCompactPreviewPointerDown = useCallback(
    (event) => {
      if (!usesMobilePreview || submitting || !isTextEditorTarget(event.target)) return;
      compactTapStartRef.current = { x: event.clientX || 0, y: event.clientY || 0, started: true };
    },
    [submitting, usesMobilePreview]
  );

  const handleCompactPreviewClick = useCallback(
    (event) => {
      if (!usesMobilePreview || submitting || !isTextEditorTarget(event.target)) return;
      const start = compactTapStartRef.current;
      const moved = start.started && (Math.abs((event.clientX || 0) - start.x) > 8 || Math.abs((event.clientY || 0) - start.y) > 8);
      compactTapStartRef.current = { x: 0, y: 0, started: false };
      if (moved) return;
      openWritingMode();
    },
    [openWritingMode, submitting, usesMobilePreview]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    editor?.setEditable(mounted && !submitting && !usesMobilePreview);
  }, [editor, mounted, submitting, usesMobilePreview]);

  useEffect(() => {
    writingModeOpenRef.current = writingModeOpen;
  }, [writingModeOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const query = window.matchMedia("(max-width: 640px)");
    const updatePhoneScreen = () => {
      phoneScreenRef.current = query.matches;
      setPhoneScreen(query.matches);
    };
    updatePhoneScreen();
    query.addEventListener?.("change", updatePhoneScreen);
    return () => query.removeEventListener?.("change", updatePhoneScreen);
  }, []);

  // Lock background scrolling while the full-screen editor is open so the page
  // behind it does not move (a common source of the jumping effect).
  useEffect(() => {
    if (!writingModeOpen) return undefined;

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const previous = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      overscroll: document.documentElement.style.overscrollBehavior,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previous.htmlOverflow;
      document.body.style.overflow = previous.bodyOverflow;
      document.documentElement.style.overscrollBehavior = previous.overscroll;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [writingModeOpen]);

  useEffect(() => {
    if (!mounted || !editor || editor.isFocused || writingModeOpen) return;
    const currentHtml = sanitizeComposerHtml(editor.getHTML());
    const nextHtml = sanitizeComposerHtml(body || "");
    if (nextHtml !== currentHtml) editor.commands.setContent(nextHtml || "", false);
  }, [body, editor, mounted, writingModeOpen]);

  useImperativeHandle(
    editorRef,
    () => ({
      focus: () => editor?.commands.focus(undefined, { scrollIntoView: false }),
      focusEnd: () => placeCaretAtEnd(editor),
      openLongEditor: openWritingMode,
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
    [editor, emitContent, getDisplayFormats, openWritingMode, placeCaretAtEnd, runFormatCommand]
  );

  const editorContent = mounted ? <EditorContent editor={editor} /> : <div className={`${EDITOR_CLASSNAME} ProseMirror`} aria-hidden="true" />;

  if (mounted && writingModeOpen) {
    return (
      <MobileTextEditorOverlay
        editorContent={editorContent}
        activeFormats={activeFormats}
        onDone={closeWritingMode}
        onFormat={runFormatCommand}
        onOverlayReady={() => placeCaretAtEnd(editor)}
        onEditorAreaClick={() => placeCaretAtEnd(editor)}
        onViewportChange={() => scrollCaretIntoView(editor)}
      />
    );
  }

  return (
    <div
      className="soldierhub-normal-editor relative"
      data-page-mode={pageMode ? "true" : "false"}
      data-preview={usesMobilePreview ? "true" : "false"}
      suppressHydrationWarning
      onPointerDownCapture={handleCompactPreviewPointerDown}
      onClick={handleCompactPreviewClick}
    >
      <div
        className="soldierhub-editor-surface relative rounded-2xl border px-3.5 py-3"
        style={{ backgroundColor: T.surfaceSoft, borderColor: T.borderSoft }}
      >
        {editorContent}

        {usesMobilePreview ? (
          <span
            className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold"
            style={{ backgroundColor: "#FFFFFF", borderColor: T.borderSoft, color: T.textSubtle }}
          >
            <Maximize2 size={11} strokeWidth={2.6} /> Tap to write
          </span>
        ) : null}
      </div>

      {imageProcessing && !selectedImage ? (
        <div data-composer-media="true" className="mt-3 flex items-center gap-3 rounded-2xl border px-3.5 py-3" style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft }}>
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
        <div
          data-composer-media="true"
          className="mt-3 overflow-hidden rounded-2xl border"
          style={{ backgroundColor: "#EEF3F8", borderColor: T.borderSoft }}
          onPointerDownCapture={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative flex justify-center bg-[#EEF3F8]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview URL, next/image not applicable */}
            <img src={selectedImage.previewUrl} alt="Selected post preview" className="block max-h-[40vh] w-full object-cover md:max-h-[340px]" style={{ aspectRatio: selectedImageAspectRatio }} />
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
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
        .soldierhub-normal-editor[data-page-mode="true"] .ProseMirror { min-height: 200px; max-height: 46vh; }
        .soldierhub-normal-editor .ProseMirror::-webkit-scrollbar { width: 6px; }
        .soldierhub-normal-editor .ProseMirror::-webkit-scrollbar-track { background: transparent; }
        .soldierhub-normal-editor .ProseMirror::-webkit-scrollbar-thumb { background-color: rgba(63,95,125,0.22); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
        .soldierhub-normal-editor[data-preview="true"] .ProseMirror { caret-color: transparent; cursor: pointer; user-select: none; -webkit-user-select: none; touch-action: pan-y; overscroll-behavior: contain; }
        .soldierhub-normal-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #a8abb2; pointer-events: none; height: 0; }
      `}</style>
    </div>
  );
}
