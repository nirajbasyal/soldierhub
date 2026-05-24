"use client";

import { useEffect, useImperativeHandle, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Loader2, Undo2, X } from "lucide-react";
import { T } from "@/lib/theme";
import { EDITOR_CLASSNAME, sanitizeComposerHtml } from "./composerUtils";

export default function TipTapComposerEditor({
  editorRef,
  body,
  plainText,
  selectedImage,
  imageProcessing,
  submitting,
  clearedDraft,
  onClearText,
  onRestoreText,
  onRemoveImage,
  onChange,
  onFormatChange,
}) {
  const selectedImageAspectRatio = selectedImage?.width && selectedImage?.height ? `${selectedImage.width} / ${selectedImage.height}` : "16 / 10";
  const showTextClearControl = Boolean(plainText?.trim()) || Boolean(clearedDraft);

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
    },
    onCreate({ editor: tiptap }) {
      onFormatChange?.(getActiveFormats(tiptap));
    },
    onUpdate({ editor: tiptap }) {
      const html = sanitizeComposerHtml(tiptap.getHTML());
      const text = tiptap.getText("\n").replace(/\u00a0/g, " ").trim();
      onChange?.({ html, text, structured: hasStructuredContent(tiptap) });
      onFormatChange?.(getActiveFormats(tiptap));
    },
    onSelectionUpdate({ editor: tiptap }) {
      onFormatChange?.(getActiveFormats(tiptap));
    },
    onFocus({ editor: tiptap }) {
      onFormatChange?.(getActiveFormats(tiptap));
    },
  });

  useEffect(() => {
    editor?.setEditable(!submitting);
  }, [editor, submitting]);

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

  return (
    <div className="relative overflow-hidden rounded-[24px] border px-3.5 py-3 md:px-4 md:py-3.5" style={{ backgroundColor: "#F8FAFD", borderColor: T.borderSoft }}>
      {showTextClearControl ? (
        <button type="button" onClick={clearedDraft ? onRestoreText : onClearText} disabled={submitting} className="sh-tap absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.96] disabled:opacity-50" style={{ backgroundColor: "rgba(255,255,255,0.96)", borderColor: T.border, color: T.navy }} aria-label={clearedDraft ? "Undo cleared text" : "Clear text"} title={clearedDraft ? "Undo" : "Clear text"}>
          {clearedDraft ? <Undo2 size={16} strokeWidth={2.7} /> : <X size={16} strokeWidth={2.9} />}
        </button>
      ) : null}

      <EditorContent editor={editor} />

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
      `}</style>
    </div>
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
