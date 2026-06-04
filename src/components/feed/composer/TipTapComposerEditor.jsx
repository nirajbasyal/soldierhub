"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Loader2, X } from "lucide-react";
import { T } from "@/lib/theme";
import { EDITOR_CLASSNAME, sanitizeComposerHtml } from "./composerUtils";
import MobileTextEditorOverlay from "./MobileTextEditorOverlay";

const PLACEHOLDER = "Ask, share, or help the Fort Bliss community.";
const USER_SCROLL_LOCK_MS = 1400;

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
  const savedSelectionRef = useRef(null);
  const suppressOpenUntilRef = useRef(0);
  const phoneScreenRef = useRef(false);
  const writingModeOpenRef = useRef(false);
  const manualInlineFormatsRef = useRef({ bold: false, italic: false });
  const compactTapStartRef = useRef({ x: 0, y: 0, scrollTop: 0, started: false });
  const userScrollLockUntilRef = useRef(0);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, bullet: false, number: false });

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
      const text = tiptap?.getText?.("\n")?.replace(/\u00a0/g, " ").trim() || "";
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

  const markUserScrolling = useCallback(() => {
    userScrollLockUntilRef.current = Date.now() + USER_SCROLL_LOCK_MS;
  }, []);

  const keepCursorVisible = useCallback((tiptap, placeNearKeyboard = false, force = false) => {
    const scrollBox = document.querySelector(".soldierhub-mobile-text-shell");
    if (!scrollBox || !tiptap?.view || !tiptap?.state?.selection?.empty) return;
    if (!force && writingModeOpenRef.current && Date.now() < userScrollLockUntilRef.current) return;

    window.requestAnimationFrame?.(() => {
      if (!force && writingModeOpenRef.current && Date.now() < userScrollLockUntilRef.current) return;

      try {
        const position = tiptap.state.selection?.to ?? tiptap.state.doc.content.size;
        const cursor = tiptap.view.coordsAtPos(position);
        const box = scrollBox.getBoundingClientRect();
        const desiredBottomGap = placeNearKeyboard ? 96 : 120;
        const desiredBottom = box.bottom - desiredBottomGap;
        const safeTop = box.top + 24;

        if (cursor.bottom > desiredBottom) scrollBox.scrollTop += cursor.bottom - desiredBottom;
        if (placeNearKeyboard && cursor.bottom < desiredBottom - 88) scrollBox.scrollTop -= desiredBottom - cursor.bottom - 88;
        if (cursor.top < safeTop) scrollBox.scrollTop -= safeTop - cursor.top + 16;
      } catch {
        if (force) scrollBox.scrollTop = Math.max(0, scrollBox.scrollHeight - scrollBox.clientHeight - 56);
      }
    });
  }, []);

  const focusEditorAtEnd = useCallback(
    (tiptap, placeNearKeyboard = true) => {
      if (!tiptap) return;
      const endPosition = Math.max(0, tiptap.state?.doc?.content?.size ?? 0);
      tiptap.commands.setTextSelection(endPosition);
      tiptap.commands.focus(undefined, { scrollIntoView: false });
      applyStoredMarks(tiptap);
      rememberSelection(tiptap);
      syncFormats(tiptap);
      keepCursorVisible(tiptap, placeNearKeyboard, true);
    },
    [applyStoredMarks, keepCursorVisible, rememberSelection, syncFormats]
  );

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
      handleDOMEvents: {
        beforeinput(view, event) {
          if (pageMode && phoneScreenRef.current && !writingModeOpenRef.current) {
            event.preventDefault();
            return true;
          }
          return false;
        },
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
      keepCursorVisible(tiptap, false, true);
    },
    onSelectionUpdate({ editor: tiptap }) {
      rememberSelection(tiptap);
      syncFormats(tiptap);
      keepCursorVisible(tiptap);
    },
    onFocus({ editor: tiptap }) {
      rememberSelection(tiptap);
      applyStoredMarks(tiptap);
      syncFormats(tiptap);
      keepCursorVisible(tiptap, false, true);
    },
    onBlur({ editor: tiptap }) {
      rememberSelection(tiptap);
    },
  });

  const suppressMobileEditorOpen = useCallback(() => {
    suppressOpenUntilRef.current = Date.now() + 700;
  }, []);

  const handleRemoveImage = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      suppressMobileEditorOpen();
      editor?.commands.blur();
      onRemoveImage?.();
    },
    [editor, onRemoveImage, suppressMobileEditorOpen]
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
      keepCursorVisible(editor, false, true);
      emitContent(editor);
    },
    [applyStoredMarks, editor, emitContent, keepCursorVisible, rememberSelection, submitting, syncFormats]
  );

  const handleCompactPreviewPointerDown = useCallback((event) => {
    if (!pageMode || !phoneScreen || submitting || !isTextEditorTarget(event.target)) return;
    const scrollBox = event.target.closest(".soldierhub-normal-editor .ProseMirror");
    compactTapStartRef.current = {
      x: event.clientX || 0,
      y: event.clientY || 0,
      scrollTop: scrollBox?.scrollTop || 0,
      started: true,
    };
  }, [pageMode, phoneScreen, submitting]);

  const handleCompactPreviewClick = useCallback(
    (event) => {
      if (!pageMode || !phoneScreen || submitting || !isTextEditorTarget(event.target)) return;

      const scrollBox = event.target.closest(".soldierhub-normal-editor .ProseMirror");
      const start = compactTapStartRef.current;
      const moved = start.started && (Math.abs((event.clientX || 0) - start.x) > 8 || Math.abs((event.clientY || 0) - start.y) > 8 || Math.abs((scrollBox?.scrollTop || 0) - start.scrollTop) > 4);

      compactTapStartRef.current = { x: 0, y: 0, scrollTop: 0, started: false };
      if (moved) return;

      openWritingMode();
    },
    [openWritingMode, pageMode, phoneScreen, submitting]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const compactMobilePreview = pageMode && phoneScreen && !writingModeOpen;
    editor?.setEditable(mounted && !submitting && !compactMobilePreview);
  }, [editor, mounted, pageMode, phoneScreen, submitting, writingModeOpen]);

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

  useEffect(() => {
    if (!writingModeOpen) return undefined;

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverscroll = document.documentElement.style.overscrollBehavior;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;
    let scrollBox = null;
    const attachTimer = window.setTimeout(() => {
      scrollBox = document.querySelector(".soldierhub-mobile-text-shell");
      scrollBox?.addEventListener("scroll", markUserScrolling, { passive: true });
      scrollBox?.addEventListener("touchstart", markUserScrolling, { passive: true });
      scrollBox?.addEventListener("wheel", markUserScrolling, { passive: true });
    }, 0);

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      window.clearTimeout(attachTimer);
      scrollBox?.removeEventListener("scroll", markUserScrolling);
      scrollBox?.removeEventListener("touchstart", markUserScrolling);
      scrollBox?.removeEventListener("wheel", markUserScrolling);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [markUserScrolling, writingModeOpen]);

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
      focusEnd: () => focusEditorAtEnd(editor, true),
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
    [editor, emitContent, focusEditorAtEnd, getDisplayFormats, openWritingMode, runFormatCommand]
  );

  const editorContent = mounted ? <EditorContent editor={editor} /> : <div className={`${EDITOR_CLASSNAME} ProseMirror`} aria-hidden="true" />;

  if (mounted && writingModeOpen) {
    return (
      <MobileTextEditorOverlay
        editorContent={editorContent}
        activeFormats={activeFormats}
        onDone={closeWritingMode}
        onFormat={runFormatCommand}
        onOverlayReady={() => focusEditorAtEnd(editor, true)}
        onEditorAreaClick={() => keepCursorVisible(editor, false, true)}
        onViewportChange={() => keepCursorVisible(editor, true, true)}
      />
    );
  }

  return (
    <div
      className="soldierhub-normal-editor relative overflow-visible px-1 py-2 md:px-1.5 md:py-2.5"
      style={{ backgroundColor: "transparent" }}
      suppressHydrationWarning
      onPointerDownCapture={handleCompactPreviewPointerDown}
      onClick={handleCompactPreviewClick}
    >
      {editorContent}

      {imageProcessing && !selectedImage ? (
        <div data-composer-media="true" className="mt-3 flex items-center gap-3 rounded-[20px] border px-3.5 py-3" style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft }}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(63,95,125,0.12)", color: T.navy }}>
            <Loader2 size={17} className="animate-spin" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-extrabold" style={{ color: T.text }}>Preparing your photo</div>
            <div className="text-xs font-medium" style={{ color: T.textSubtle }}>Please wait before publishing.</div>
          </div>
        </div>
      ) : null}

      {selectedImage ? (
        <div
          data-composer-media="true"
          className="mt-3 overflow-hidden rounded-[22px] border"
          style={{ backgroundColor: "#EEF3F8", borderColor: T.borderSoft }}
          onPointerDownCapture={(event) => {
            event.stopPropagation();
            suppressMobileEditorOpen();
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative flex justify-center bg-[#EEF3F8]">
            <img src={selectedImage.previewUrl} alt="Selected post preview" className="block max-h-[40vh] w-full object-cover md:max-h-[340px]" style={{ aspectRatio: selectedImageAspectRatio }} />
            <button
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
                suppressMobileEditorOpen();
              }}
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
        .soldierhub-normal-editor,
        .soldierhub-normal-editor > div,
        .soldierhub-normal-editor .ProseMirror { background: transparent !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; outline: 0 !important; }
        .soldierhub-normal-editor .ProseMirror { width: 100%; max-height: 170px; min-height: 170px; margin: 0 !important; padding: 2px 8px 2px 0 !important; color: ${T.text}; white-space: pre-wrap; overflow-wrap: anywhere; overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: rgba(63,95,125,0.24) transparent; }
        .soldierhub-normal-editor .ProseMirror::-webkit-scrollbar { width: 6px; }
        .soldierhub-normal-editor .ProseMirror::-webkit-scrollbar-track { background: transparent; }
        .soldierhub-normal-editor .ProseMirror::-webkit-scrollbar-thumb { background-color: rgba(63,95,125,0.22); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
        @media (max-width: 640px) { .soldierhub-normal-editor .ProseMirror { max-height: 170px; overflow-y: auto; -webkit-overflow-scrolling: touch; caret-color: transparent; cursor: pointer; user-select: none; touch-action: pan-y; overscroll-behavior: contain; } .soldierhub-normal-editor .ProseMirror::-webkit-scrollbar { width: 4px; } }
        @media (min-width: 641px) { .soldierhub-normal-editor .ProseMirror { max-height: none; overflow-y: visible; user-select: text; caret-color: auto; cursor: text; } }
        .soldierhub-normal-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #a8abb2; pointer-events: none; height: 0; }
      `}</style>
    </div>
  );
}
