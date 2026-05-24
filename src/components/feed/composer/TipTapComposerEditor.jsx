"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Loader2, X } from "lucide-react";
import { T } from "@/lib/theme";
import { EDITOR_CLASSNAME, FORMAT_ACTIONS, sanitizeComposerHtml } from "./composerUtils";

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
  const [writingModeOpen, setWritingModeOpen] = useState(false);
  const [phoneScreen, setPhoneScreen] = useState(false);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, bullet: false, number: false });
  const editorScrollRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const suppressOpenUntilRef = useRef(0);
  const phoneScreenRef = useRef(false);
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
      Placeholder.configure({
        placeholder: PLACEHOLDER,
        emptyEditorClass: "is-editor-empty",
      }),
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
      bold: Boolean(manualInlineFormatsRef.current.bold),
      italic: Boolean(manualInlineFormatsRef.current.italic),
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

  const keepCursorVisible = useCallback((tiptap, forceEnd = false) => {
    const scrollBox = editorScrollRef.current;
    if (!scrollBox || !tiptap?.view) return;

    window.requestAnimationFrame?.(() => {
      try {
        if (forceEnd) {
          scrollBox.scrollTop = scrollBox.scrollHeight;
          return;
        }

        const position = tiptap.state.selection?.to ?? tiptap.state.doc.content.size;
        const cursor = tiptap.view.coordsAtPos(position);
        const box = scrollBox.getBoundingClientRect();
        const safeBottom = box.bottom - 130;
        const safeTop = box.top + 24;

        if (cursor.bottom > safeBottom) scrollBox.scrollTop += cursor.bottom - safeBottom + 92;
        if (cursor.top < safeTop) scrollBox.scrollTop -= safeTop - cursor.top + 28;
      } catch {
        scrollBox.scrollTop = scrollBox.scrollHeight;
      }
    });
  }, []);

  const editor = useEditor({
    extensions,
    content: body || "",
    editable: !submitting,
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
          if (pageMode && phoneScreenRef.current && !writingModeOpen) {
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
      keepCursorVisible(tiptap);
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
      keepCursorVisible(tiptap, true);
    },
    onBlur({ editor: tiptap }) {
      rememberSelection(tiptap);
    },
  });

  const openWritingMode = useCallback(() => {
    if (!pageMode || !phoneScreenRef.current || submitting) return;
    if (Date.now() < suppressOpenUntilRef.current) return;

    setWritingModeOpen(true);
    window.setTimeout(() => {
      editor?.chain().focus("end", { scrollIntoView: false }).run();
      applyStoredMarks(editor);
      rememberSelection(editor);
      syncFormats(editor);
      keepCursorVisible(editor, true);
    }, 100);
  }, [applyStoredMarks, editor, keepCursorVisible, pageMode, rememberSelection, submitting, syncFormats]);

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
        const nextBold = !manualInlineFormatsRef.current.bold;
        manualInlineFormatsRef.current = { ...manualInlineFormatsRef.current, bold: nextBold };
        if (from !== to) nextBold ? editor.commands.setBold() : editor.commands.unsetBold();
        applyStoredMarks(editor);
      }

      if (command === "italic") {
        const nextItalic = !manualInlineFormatsRef.current.italic;
        manualInlineFormatsRef.current = { ...manualInlineFormatsRef.current, italic: nextItalic };
        if (from !== to) nextItalic ? editor.commands.setItalic() : editor.commands.unsetItalic();
        applyStoredMarks(editor);
      }

      if (command === "insertUnorderedList") editor.commands.toggleBulletList();
      if (command === "insertOrderedList") editor.commands.toggleOrderedList();

      rememberSelection(editor);
      syncFormats(editor);
      keepCursorVisible(editor);
    },
    [applyStoredMarks, editor, keepCursorVisible, rememberSelection, submitting, syncFormats]
  );

  useEffect(() => {
    editor?.setEditable(!submitting);
  }, [editor, submitting]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const query = window.matchMedia("(max-width: 640px)");
    const updatePhoneScreen = () => {
      phoneScreenRef.current = query.matches;
      setPhoneScreen(query.matches);
    };
    updatePhoneScreen();

    if (query.addEventListener) {
      query.addEventListener("change", updatePhoneScreen);
      return () => query.removeEventListener("change", updatePhoneScreen);
    }

    query.addListener(updatePhoneScreen);
    return () => query.removeListener(updatePhoneScreen);
  }, []);

  useEffect(() => {
    if (!writingModeOpen) return undefined;

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [writingModeOpen]);

  useEffect(() => {
    if (!writingModeOpen) return undefined;

    const update = () => window.setTimeout(() => keepCursorVisible(editor, true), 80);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [editor, keepCursorVisible, writingModeOpen]);

  useEffect(() => {
    if (!editor || editor.isFocused || writingModeOpen) return;
    const currentHtml = sanitizeComposerHtml(editor.getHTML());
    const nextHtml = sanitizeComposerHtml(body || "");
    if (nextHtml !== currentHtml) editor.commands.setContent(nextHtml || "", false);
  }, [body, editor, writingModeOpen]);

  useImperativeHandle(
    editorRef,
    () => ({
      focus: () => editor?.commands.focus(undefined, { scrollIntoView: false }),
      focusEnd: () => editor?.chain().focus("end", { scrollIntoView: false }).run(),
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
    [editor, emitContent, getDisplayFormats, openWritingMode, runFormatCommand]
  );

  const editorContent = <EditorContent editor={editor} />;

  if (writingModeOpen) {
    return (
      <div className="fixed inset-0 z-[2147483000] h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none bg-[#F8FAFD] md:hidden" role="dialog" aria-modal="true" aria-label="Expanded post text editor">
        <div className="fixed left-0 right-0 top-0 z-[2147483647] border-b bg-[#F8FAFD]/98 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl" style={{ borderColor: T.borderSoft, paddingTop: "env(safe-area-inset-top)" }}>
          <div className="flex h-[56px] items-center justify-between px-4">
            <div className="w-16" />
            <div className="text-[21px] font-extrabold tracking-[-0.03em]" style={{ color: T.text }}>Add Text</div>
            <button type="button" onClick={closeWritingMode} className="sh-tap w-16 rounded-full px-2 py-2 text-right text-[17px] font-bold transition active:scale-[0.98]" style={{ color: T.navy }}>
              Done
            </button>
          </div>

          <div className="border-t px-3 py-2" style={{ borderColor: T.borderSoft }}>
            <div className="grid grid-cols-4 items-center gap-2">
              {FORMAT_ACTIONS.map((action) => {
                const Icon = action.icon;
                const isActive = Boolean(activeFormats[action.key]);
                return (
                  <button
                    key={action.key}
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      runFormatCommand(action.command);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    className="sh-tap flex h-10 w-full items-center justify-center rounded-full border shadow-sm transition active:scale-[0.97]"
                    style={{ backgroundColor: isActive ? T.navy : "#FFFFFF", borderColor: isActive ? T.navy : T.border, color: isActive ? "#FFFFFF" : T.navy }}
                    aria-label={action.label}
                    aria-pressed={isActive}
                    title={action.label}
                  >
                    <Icon size={18} strokeWidth={2.65} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          ref={editorScrollRef}
          className="soldierhub-writing-editor fixed bottom-0 left-0 right-0 overflow-y-auto overscroll-contain bg-[#F8FAFD]"
          style={{ top: "calc(env(safe-area-inset-top) + 113px)", WebkitOverflowScrolling: "touch", scrollPaddingTop: "18px", scrollPaddingBottom: "34vh" }}
          onClick={() => {
            editor?.chain().focus("end", { scrollIntoView: false }).run();
            keepCursorVisible(editor, true);
          }}
        >
          {editorContent}
        </div>

        <style jsx global>{`
          .soldierhub-writing-editor,
          .soldierhub-writing-editor > div { min-height: 100%; width: 100%; display: flex; flex: 1 1 auto; background: #F8FAFD !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; outline: 0 !important; }
          .soldierhub-writing-editor .ProseMirror { flex: 1 1 auto; min-height: 100%; width: 100%; margin: 0 !important; padding: 20px 18px calc(env(safe-area-inset-bottom) + 34vh) !important; color: ${T.text}; background: #F8FAFD !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; outline: 0 !important; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 18px; line-height: 2rem; }
          .soldierhub-writing-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #a8abb2; pointer-events: none; height: 0; }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="soldierhub-normal-editor relative overflow-visible px-1 py-2 md:px-1.5 md:py-2.5"
      style={{ backgroundColor: "transparent" }}
      onFocusCapture={() => {
        if (pageMode && phoneScreen && !submitting) openWritingMode();
      }}
      onPointerDownCapture={(event) => {
        if (!pageMode || !phoneScreen || submitting) return;
        const target = event.target;
        if (target instanceof Element && target.closest(".soldierhub-normal-editor .ProseMirror")) {
          event.preventDefault();
          openWritingMode();
        }
      }}
      onClick={(event) => {
        if (!pageMode || !phoneScreen || submitting) return;
        const target = event.target;
        if (target instanceof Element && target.closest(".soldierhub-normal-editor .ProseMirror")) openWritingMode();
      }}
    >
      {editorContent}

      {imageProcessing && !selectedImage ? (
        <div className="mt-3 flex items-center gap-3 rounded-[20px] border px-3.5 py-3" style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft }}>
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
        <div className="mt-3 overflow-hidden rounded-[22px] border" style={{ backgroundColor: "#EEF3F8", borderColor: T.borderSoft }}>
          <div className="relative flex justify-center bg-[#EEF3F8]">
            <img src={selectedImage.previewUrl} alt="Selected post preview" className="block max-h-[62vh] w-full object-cover md:max-h-[340px]" style={{ aspectRatio: selectedImageAspectRatio }} />
            <button type="button" onClick={onRemoveImage} disabled={submitting || imageProcessing} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.98] disabled:opacity-50" style={{ backgroundColor: "rgba(255,255,255,0.94)", borderColor: T.border, color: T.navy }} aria-label="Remove selected photo" title="Remove photo">
              <X size={16} strokeWidth={2.8} />
            </button>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .soldierhub-normal-editor,
        .soldierhub-normal-editor > div,
        .soldierhub-normal-editor .ProseMirror { background: transparent !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; outline: 0 !important; }
        .soldierhub-normal-editor .ProseMirror { width: 100%; max-height: 170px; min-height: 170px; margin: 0 !important; padding: 2px 0 !important; color: ${T.text}; white-space: pre-wrap; overflow-wrap: anywhere; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        @media (max-width: 640px) { .soldierhub-normal-editor .ProseMirror { caret-color: transparent; cursor: pointer; user-select: none; } }
        @media (min-width: 641px) { .soldierhub-normal-editor .ProseMirror { max-height: none; overflow-y: visible; user-select: text; caret-color: auto; cursor: text; } }
        .soldierhub-normal-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #a8abb2; pointer-events: none; height: 0; }
      `}</style>
    </div>
  );
}
