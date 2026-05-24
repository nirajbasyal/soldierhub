"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Loader2, Undo2, X } from "lucide-react";
import { T } from "@/lib/theme";
import { EDITOR_CLASSNAME, FORMAT_ACTIONS, sanitizeComposerHtml } from "./composerUtils";

const LONG_EDITOR_TRIGGER_CHARS = 260;
const LONG_EDITOR_TRIGGER_ROWS = 7;

function getViewportSnapshot() {
  if (typeof window === "undefined") return { height: 720, top: 0 };
  const viewport = window.visualViewport;
  return {
    height: Math.max(320, Math.floor(viewport?.height || window.innerHeight || 0)),
    top: Math.max(0, Math.floor(viewport?.offsetTop || 0)),
  };
}

function getEstimatedRows(text = "") {
  return String(text || "")
    .split(/\n/)
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 34)), 0);
}

function shouldUseLongEditor(text = "") {
  const cleanText = String(text || "").trim();
  if (!cleanText) return false;
  return cleanText.length >= LONG_EDITOR_TRIGGER_CHARS || getEstimatedRows(cleanText) >= LONG_EDITOR_TRIGGER_ROWS;
}

export default function TipTapComposerEditor({
  editorRef,
  body,
  plainText,
  selectedImage,
  imageProcessing,
  submitting,
  clearedDraft,
  pageMode = false,
  onClearText,
  onRestoreText,
  onRemoveImage,
  onChange,
  onFormatChange,
}) {
  const selectedImageAspectRatio = selectedImage?.width && selectedImage?.height ? `${selectedImage.width} / ${selectedImage.height}` : "16 / 10";
  const showTextClearControl = Boolean(plainText?.trim()) || Boolean(clearedDraft);
  const [longEditorOpen, setLongEditorOpen] = useState(false);
  const [phoneScreen, setPhoneScreen] = useState(false);
  const [viewport, setViewport] = useState({ height: null, top: 0 });
  const [activeFormats, setActiveFormats] = useState({});
  const suppressLongEditorUntilRef = useRef(0);

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
        placeholder: "Ask a question, share an update, or help the SoldierHub community...",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    []
  );

  const syncFormats = (tiptap) => {
    const nextFormats = getActiveFormats(tiptap);
    setActiveFormats(nextFormats);
    onFormatChange?.(nextFormats);
  };

  const editor = useEditor({
    extensions,
    content: body || "",
    editable: !submitting,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${EDITOR_CLASSNAME} min-h-[170px] focus:outline-none`,
        role: "textbox",
        "aria-label": "Write your SoldierHub post",
        "aria-multiline": "true",
      },
      transformPastedHTML(html) {
        return sanitizeComposerHtml(html || "");
      },
      transformPastedText(text) {
        return String(text || "");
      },
      handleFocus: () => {
        maybeOpenLongEditor();
        return false;
      },
      handleClick: () => {
        maybeOpenLongEditor();
        return false;
      },
    },
    onCreate({ editor: tiptap }) {
      syncFormats(tiptap);
    },
    onUpdate({ editor: tiptap }) {
      const html = sanitizeComposerHtml(tiptap.getHTML());
      const text = tiptap.getText("\n").replace(/\u00a0/g, " ").trim();
      onChange?.({ html, text, structured: hasStructuredContent(tiptap) });
      syncFormats(tiptap);
      maybeOpenLongEditor(text);
    },
    onSelectionUpdate({ editor: tiptap }) {
      syncFormats(tiptap);
    },
    onFocus({ editor: tiptap }) {
      syncFormats(tiptap);
    },
  });

  const maybeOpenLongEditor = (incomingText) => {
    if (!pageMode || !phoneScreen || longEditorOpen || submitting) return;
    if (Date.now() < suppressLongEditorUntilRef.current) return;
    const text = incomingText ?? editor?.getText("\n") ?? plainText;
    if (!shouldUseLongEditor(text)) return;

    setViewport(getViewportSnapshot());
    setLongEditorOpen(true);
    window.requestAnimationFrame?.(() => editor?.chain().focus("end").run());
  };

  const closeLongEditor = () => {
    suppressLongEditorUntilRef.current = Date.now() + 900;
    setLongEditorOpen(false);
    editor?.commands.blur();
  };

  const applyMobileFormatting = (command) => {
    if (!editor || submitting) return;
    runCommand(editor, command);
    window.requestAnimationFrame?.(() => syncFormats(editor));
  };

  useEffect(() => {
    editor?.setEditable(!submitting);
  }, [editor, submitting]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const query = window.matchMedia("(max-width: 640px)");
    const updatePhoneScreen = () => setPhoneScreen(query.matches);
    updatePhoneScreen();

    if (query.addEventListener) {
      query.addEventListener("change", updatePhoneScreen);
      return () => query.removeEventListener("change", updatePhoneScreen);
    }

    query.addListener(updatePhoneScreen);
    return () => query.removeListener(updatePhoneScreen);
  }, []);

  useEffect(() => {
    if (!longEditorOpen) return undefined;

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [longEditorOpen]);

  useEffect(() => {
    if (!longEditorOpen) return undefined;

    const updateViewport = () => setViewport(getViewportSnapshot());
    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [longEditorOpen]);

  useImperativeHandle(
    editorRef,
    () => ({
      focus: () => editor?.chain().focus().run(),
      focusEnd: () => editor?.chain().focus("end").run(),
      get innerHTML() {
        return editor ? sanitizeComposerHtml(editor.getHTML()) : "";
      },
      set innerHTML(value) {
        editor?.commands.setContent(sanitizeComposerHtml(value || ""), false);
      },
      get textContent() {
        return editor?.getText("\n") || "";
      },
      set textContent(value) {
        const clean = String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");
        editor?.commands.setContent(`<p>${clean}</p>`, false);
      },
      get innerText() {
        return editor?.getText("\n") || "";
      },
      style: {},
      querySelector: (selector) => editor?.view?.dom?.querySelector?.(selector) || null,
      hasStructuredContent: () => hasStructuredContent(editor),
      getActiveFormats: () => getActiveFormats(editor),
      clearList: () => {
        if (editor?.isActive("bulletList")) editor.chain().focus().toggleBulletList().run();
        if (editor?.isActive("orderedList")) editor.chain().focus().toggleOrderedList().run();
      },
      runCommand: (command) => runCommand(editor, command),
      blur: () => editor?.commands.blur(),
    }),
    [editor]
  );

  useEffect(() => {
    if (!editor) return;
    const currentHtml = sanitizeComposerHtml(editor.getHTML());
    const nextHtml = sanitizeComposerHtml(body || "");
    if (nextHtml !== currentHtml && !editor.isFocused) editor.commands.setContent(nextHtml || "", false);
  }, [body, editor]);

  const editorContent = <EditorContent editor={editor} />;

  return (
    <>
      <div className="relative overflow-hidden rounded-[24px] border px-3.5 py-3 md:px-4 md:py-3.5" style={{ backgroundColor: "#F8FAFD", borderColor: T.borderSoft }}>
        {showTextClearControl ? (
          <button type="button" onClick={clearedDraft ? onRestoreText : onClearText} disabled={submitting} className="sh-tap absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.96] disabled:opacity-50" style={{ backgroundColor: "rgba(255,255,255,0.96)", borderColor: T.border, color: T.navy }} aria-label={clearedDraft ? "Undo cleared text" : "Clear text"} title={clearedDraft ? "Undo" : "Clear text"}>
            {clearedDraft ? <Undo2 size={16} strokeWidth={2.7} /> : <X size={16} strokeWidth={2.9} />}
          </button>
        ) : null}

        {!longEditorOpen ? editorContent : null}

        {longEditorOpen ? (
          <div className="min-h-[170px] px-1 py-5 text-[15px] font-semibold" style={{ color: T.textSubtle }}>
            Continue writing in the expanded editor.
          </div>
        ) : null}

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
          .ProseMirror { color: ${T.text}; border: none; box-shadow: none; outline: none; white-space: pre-wrap; overflow-wrap: anywhere; }
          .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #a8abb2; pointer-events: none; height: 0; }
          .soldierhub-long-editor .ProseMirror {
            min-height: 100%;
            width: 100%;
            padding: 18px 18px calc(env(safe-area-inset-bottom) + 96px);
            border-radius: 0 !important;
            background: transparent !important;
            font-size: 18px;
            line-height: 2rem;
          }
          .soldierhub-long-editor .ProseMirror:focus {
            outline: none;
          }
        `}</style>
      </div>

      {longEditorOpen ? (
        <div
          className="fixed left-0 right-0 z-[140] flex max-h-[100dvh] flex-col overflow-hidden overscroll-contain md:hidden"
          style={{
            backgroundColor: "#F8FAFD",
            height: viewport.height ? `${viewport.height}px` : "100dvh",
            top: `${viewport.top || 0}px`,
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded post text editor"
        >
          <div className="relative z-10 flex h-[58px] shrink-0 items-center justify-between border-b px-4" style={{ backgroundColor: "rgba(248,250,253,0.98)", borderColor: T.borderSoft }}>
            <div className="w-16" />
            <div className="text-[21px] font-extrabold tracking-[-0.03em]" style={{ color: T.text }}>Add text</div>
            <button type="button" onClick={closeLongEditor} className="sh-tap w-16 rounded-full px-2 py-2 text-right text-[17px] font-bold active:scale-[0.98]" style={{ color: T.navy }}>
              Done
            </button>
          </div>

          <div className="sticky top-[58px] z-20 shrink-0 border-b px-3 py-2" style={{ backgroundColor: "rgba(248,250,253,0.98)", borderColor: T.borderSoft }}>
            <div className="grid grid-cols-4 items-center gap-2">
              {FORMAT_ACTIONS.map((action) => {
                const Icon = action.icon;
                const isActive = Boolean(activeFormats[action.key]);
                return (
                  <button
                    key={action.key}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyMobileFormatting(action.command)}
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

          <div
            className="soldierhub-long-editor relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
            style={{
              backgroundColor: "#F8FAFD",
              WebkitOverflowScrolling: "touch",
              scrollPaddingBottom: "96px",
            }}
            onClick={() => editor?.chain().focus().run()}
          >
            {editorContent}
          </div>
        </div>
      ) : null}
    </>
  );
}

function runCommand(editor, command) {
  if (!editor) return;
  if (command === "bold") editor.chain().focus().toggleBold().run();
  if (command === "italic") editor.chain().focus().toggleItalic().run();
  if (command === "insertUnorderedList") editor.chain().focus().toggleBulletList().run();
  if (command === "insertOrderedList") editor.chain().focus().toggleOrderedList().run();
}

function getActiveFormats(editor) {
  return {
    bold: Boolean(editor?.isActive("bold")),
    italic: Boolean(editor?.isActive("italic")),
    bullet: Boolean(editor?.isActive("bulletList")),
    number: Boolean(editor?.isActive("orderedList")),
  };
}

function hasStructuredContent(editor) {
  return Boolean(editor?.isActive("bulletList") || editor?.isActive("orderedList") || editor?.getHTML?.().match(/<\/?(ul|ol|li|strong|em)\b/i));
}
