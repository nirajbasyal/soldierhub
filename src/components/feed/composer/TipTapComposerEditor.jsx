"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Loader2, X } from "lucide-react";
import { T } from "@/lib/theme";
import { EDITOR_CLASSNAME, FORMAT_ACTIONS, sanitizeComposerHtml } from "./composerUtils";

const COMPOSER_PLACEHOLDER = "Ask, share, or help the Fort Bliss community.";

function isEmptyEditorHtml(html = "") {
  return !String(html || "")
    .replace(/<p><\/p>|<p><br><\/p>|<br\s*\/?/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function getViewportSnapshot() {
  if (typeof window === "undefined") return { height: 720, top: 0 };
  const viewport = window.visualViewport;
  return {
    height: Math.max(320, Math.floor(viewport?.height || window.innerHeight || 0)),
    top: Math.max(0, Math.floor(viewport?.offsetTop || 0)),
  };
}

export default function TipTapComposerEditor({
  editorRef,
  body,
  plainText,
  selectedImage,
  imageProcessing,
  submitting,
  pageMode = false,
  onRemoveImage,
  onChange,
  onFormatChange,
}) {
  const selectedImageAspectRatio = selectedImage?.width && selectedImage?.height ? `${selectedImage.width} / ${selectedImage.height}` : "16 / 10";
  const [writingModeMounted, setWritingModeMounted] = useState(false);
  const [writingModeVisible, setWritingModeVisible] = useState(false);
  const [phoneScreen, setPhoneScreen] = useState(false);
  const [viewport, setViewport] = useState({ height: null, top: 0 });
  const [activeFormats, setActiveFormats] = useState({});
  const suppressWritingModeUntilRef = useRef(0);
  const editorInstanceRef = useRef(null);
  const closeTimerRef = useRef(null);
  const focusTimerRef = useRef(null);

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
        placeholder: COMPOSER_PLACEHOLDER,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    []
  );

  const syncFormats = (tiptap) => {
    const nextFormats = getActiveFormats(tiptap);
    setActiveFormats((currentFormats) => {
      const unchanged =
        currentFormats.bold === nextFormats.bold &&
        currentFormats.italic === nextFormats.italic &&
        currentFormats.bullet === nextFormats.bullet &&
        currentFormats.number === nextFormats.number;
      return unchanged ? currentFormats : nextFormats;
    });
    onFormatChange?.(nextFormats);
  };

  const syncContent = (tiptap) => {
    const html = sanitizeComposerHtml(tiptap?.getHTML?.() || "");
    const text = tiptap?.getText?.("\n")?.replace(/\u00a0/g, " ").trim() || "";
    onChange?.({ html: isEmptyEditorHtml(html) ? "" : html, text, structured: hasStructuredContent(tiptap) });
  };

  const openWritingMode = () => {
    if (!pageMode || !phoneScreen || writingModeMounted || submitting) return;
    if (Date.now() < suppressWritingModeUntilRef.current) return;

    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);

    setViewport(getViewportSnapshot());
    setWritingModeMounted(true);

    window.requestAnimationFrame?.(() => {
      setWritingModeVisible(true);
      focusTimerRef.current = window.setTimeout(() => {
        editorInstanceRef.current?.chain().focus("end", { scrollIntoView: false }).run();
        syncFormats(editorInstanceRef.current);
        focusTimerRef.current = null;
      }, 90);
    });
  };

  const shouldOpenWritingModeFromEvent = (event) => {
    if (!pageMode || !phoneScreen || submitting) return false;
    const target = event?.target;
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest(".soldierhub-normal-editor .ProseMirror"));
  };

  const handleNormalEditorPointerDown = (event) => {
    if (shouldOpenWritingModeFromEvent(event)) openWritingMode();
  };

  const handleNormalEditorClick = (event) => {
    if (shouldOpenWritingModeFromEvent(event)) openWritingMode();
  };

  const closeWritingMode = () => {
    suppressWritingModeUntilRef.current = Date.now() + 420;
    if (focusTimerRef.current) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    syncContent(editorInstanceRef.current);
    setWritingModeVisible(false);
    setWritingModeMounted(false);
  };

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
      handlePaste(view, event) {
        const html = event?.clipboardData?.getData("text/html") || "";
        if (!html) return false;

        const cleanHtml = sanitizeComposerHtml(html);
        if (!cleanHtml) return false;

        event.preventDefault();
        const tiptap = editorInstanceRef.current;
        tiptap
          ?.chain()
          .focus(undefined, { scrollIntoView: false })
          .insertContent(cleanHtml, { parseOptions: { preserveWhitespace: false } })
          .run();

        window.requestAnimationFrame?.(() => {
          syncContent(tiptap);
          syncFormats(tiptap);
        });
        return true;
      },
      handleFocus: () => {
        openWritingMode();
        return false;
      },
      handleClick: () => {
        openWritingMode();
        return false;
      },
    },
    onCreate({ editor: tiptap }) {
      editorInstanceRef.current = tiptap;
      syncFormats(tiptap);
    },
    onUpdate({ editor: tiptap }) {
      syncContent(tiptap);
      window.requestAnimationFrame?.(() => syncFormats(tiptap));
    },
    onSelectionUpdate({ editor: tiptap }) {
      syncFormats(tiptap);
    },
    onFocus({ editor: tiptap }) {
      syncFormats(tiptap);
    },
    onTransaction({ editor: tiptap }) {
      window.requestAnimationFrame?.(() => syncFormats(tiptap));
    },
  });

  useEffect(() => {
    editorInstanceRef.current = editor;
  }, [editor]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
  }, []);

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
    if (!writingModeMounted) return undefined;

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
  }, [writingModeMounted]);

  useEffect(() => {
    if (!writingModeMounted) return undefined;

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
  }, [writingModeMounted]);

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
        window.requestAnimationFrame?.(() => syncContent(editor));
      },
      get textContent() {
        return editor?.getText("\n") || "";
      },
      set textContent(value) {
        const clean = String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");
        editor?.commands.setContent(clean ? `<p>${clean}</p>` : "", false);
        window.requestAnimationFrame?.(() => syncContent(editor));
      },
      get innerText() {
        return editor?.getText("\n") || "";
      },
      style: {},
      querySelector: (selector) => editor?.view?.dom?.querySelector?.(selector) || null,
      hasStructuredContent: () => hasStructuredContent(editor),
      getActiveFormats: () => getActiveFormats(editor),
      getHTML: () => (editor ? sanitizeComposerHtml(editor.getHTML()) : ""),
      getText: () => editor?.getText("\n") || "",
      runCommand: (command) => runCommand(editor, syncFormats, command),
      blur: () => editor?.commands.blur(),
    }),
    [editor, openWritingMode]
  );

  useEffect(() => {
    if (!editor || editor.isFocused || writingModeMounted) return;
    const currentHtml = sanitizeComposerHtml(editor.getHTML());
    const nextHtml = sanitizeComposerHtml(body || "");
    if (nextHtml !== currentHtml) editor.commands.setContent(nextHtml || "", false);
  }, [body, editor, writingModeMounted]);

  const handleFormatPointerDown = (event, command) => {
    event.preventDefault();
    event.stopPropagation();
    runCommand(editor, syncFormats, command);
  };

  const handleFormatClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFormatKeyDown = (event, command) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    runCommand(editor, syncFormats, command);
  };

  const editorContent = <EditorContent editor={editor} />;

  if (writingModeMounted) {
    return (
      <div
        className="fixed left-0 right-0 z-[140] flex max-h-[100dvh] flex-col overflow-hidden overscroll-contain md:hidden"
        style={{
          backgroundColor: "#F8FAFD",
          height: viewport.height ? `${viewport.height}px` : "100dvh",
          top: `${viewport.top || 0}px`,
          opacity: writingModeVisible ? 1 : 0,
          transform: "translate3d(0,0,0)",
          transition: "opacity 120ms ease-out",
          willChange: "opacity",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Expanded post text editor"
      >
        <div className="relative z-10 flex h-[58px] shrink-0 items-center justify-between border-b px-4" style={{ backgroundColor: "rgba(248,250,253,0.98)", borderColor: T.borderSoft }}>
          <div className="w-16" />
          <div className="text-[21px] font-extrabold tracking-[-0.03em]" style={{ color: T.text }}>Add Text</div>
          <button type="button" onClick={closeWritingMode} className="sh-tap w-16 rounded-full px-2 py-2 text-right text-[17px] font-bold transition active:scale-[0.98]" style={{ color: T.navy }}>
            Done
          </button>
        </div>

        <div
          className="z-20 shrink-0 border-b px-3 py-2"
          style={{
            backgroundColor: "rgba(248,250,253,0.98)",
            borderColor: T.borderSoft,
            opacity: writingModeVisible ? 1 : 0,
            transform: "none",
            transition: "opacity 140ms ease-out 20ms",
          }}
        >
          <div className="grid grid-cols-4 items-center gap-2">
            {FORMAT_ACTIONS.map((action) => {
              const Icon = action.icon;
              const isActive = Boolean(activeFormats[action.key]);
              return (
                <button
                  key={action.key}
                  type="button"
                  onPointerDown={(event) => handleFormatPointerDown(event, action.command)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleFormatClick}
                  onKeyDown={(event) => handleFormatKeyDown(event, action.command)}
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

        <div className="soldierhub-writing-editor min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ backgroundColor: "#F8FAFD", WebkitOverflowScrolling: "touch", scrollPaddingBottom: "96px" }} onClick={() => editor?.chain().focus("end", { scrollIntoView: false }).run()}>
          {editorContent}
        </div>

        <style jsx global>{`
          .soldierhub-writing-editor,
          .soldierhub-writing-editor > div { min-height: 100%; width: 100%; display: flex; flex: 1 1 auto; background: #F8FAFD !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; outline: 0 !important; }
          .soldierhub-writing-editor .ProseMirror { flex: 1 1 auto; min-height: 100%; width: 100%; margin: 0 !important; padding: 20px 18px calc(env(safe-area-inset-bottom) + 110px) !important; color: ${T.text}; background: #F8FAFD !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; outline: 0 !important; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 18px; line-height: 2rem; transition: opacity 140ms ease-out 30ms; opacity: ${writingModeVisible ? 1 : 0}; transform: none; }
          .soldierhub-writing-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #a8abb2; pointer-events: none; height: 0; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="soldierhub-normal-editor relative overflow-hidden px-1 py-2 md:px-1.5 md:py-2.5" style={{ backgroundColor: "transparent" }} onPointerDownCapture={handleNormalEditorPointerDown} onClick={handleNormalEditorClick}>
      {editorContent}

      {imageProcessing && !selectedImage ? (
        <div className="mt-3 flex items-center gap-3 rounded-[20px] border px-3.5 py-3" style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft }}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(63,95,125,0.12)", color: T.navy }}>
            <Loader2 size={17} className="animate-spin" />
          </span>
          <div className="min-w-0"><div className="text-sm font-extrabold" style={{ color: T.text }}>Preparing your photo</div><div className="text-xs font-medium" style={{ color: T.textSubtle }}>Please wait before publishing.</div></div>
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
        .soldierhub-normal-editor .ProseMirror { width: 100%; min-height: 170px; margin: 0 !important; padding: 2px 0 !important; color: ${T.text}; white-space: pre-wrap; overflow-wrap: anywhere; }
        .soldierhub-normal-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #a8abb2; pointer-events: none; height: 0; }
      `}</style>
    </div>
  );
}

function runCommand(editor, syncFormats, command) {
  if (!editor) return;

  editor.commands.focus(undefined, { scrollIntoView: false });

  if (command === "bold") editor.commands.toggleBold();
  if (command === "italic") editor.commands.toggleItalic();
  if (command === "insertUnorderedList") editor.commands.toggleBulletList();
  if (command === "insertOrderedList") editor.commands.toggleOrderedList();

  window.requestAnimationFrame?.(() => syncFormats?.(editor));
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
