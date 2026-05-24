import { Bold, Italic, List, ListOrdered } from "lucide-react";

export const COMPOSER_DRAFT_KEY = "soldierhub_post_composer_draft_v1";
export const AUTO_SAVE_DELAY_MS = 1200;
export const FORMAT_BOUNDARY = "\u200B";

export const COMPOSER_CATEGORY_LABELS = {
  "General Q&A": "Q&A",
  "Resources & Support": "Resources",
  "New Soldier Help": "New Soldier",
  "Things To Do": "Things To Do",
};

export const FORMAT_ACTIONS = [
  { key: "bold", command: "bold", label: "Bold", shortLabel: "B", icon: Bold },
  { key: "italic", command: "italic", label: "Italic", shortLabel: "I", icon: Italic },
  { key: "bullet", command: "insertUnorderedList", label: "Bullet list", shortLabel: "• List", icon: List },
  { key: "number", command: "insertOrderedList", label: "Numbered list", shortLabel: "1. List", icon: ListOrdered },
];

export const EDITOR_CLASSNAME =
  "w-full appearance-none border-0 bg-transparent pr-10 text-[18px] leading-8 shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 md:text-[17px] md:leading-7 [&_div]:min-h-[1.65em] [&_div]:whitespace-pre-wrap [&_em]:italic [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:min-h-[1.65em] [&_p]:whitespace-pre-wrap [&_strong]:font-extrabold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1";

const ALLOWED_EDITOR_TAGS = new Set([
  "B",
  "BR",
  "DIV",
  "EM",
  "I",
  "LI",
  "OL",
  "P",
  "STRONG",
  "UL",
]);

const PARAGRAPH_LIKE_TAGS = new Set([
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
]);

export function getAnonymousDisplayName(seed) {
  const source = String(seed || "anonymous");
  let total = 0;

  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }

  return `Anonymous${String(total % 10000).padStart(4, "0")}`;
}

function styleIncludesBold(styleText = "") {
  const style = String(styleText).toLowerCase();
  if (style.includes("font-weight:bold") || style.includes("font-weight: bold")) return true;

  const weightMatch = style.match(/font-weight\s*:\s*(\d+)/i);
  return weightMatch ? Number(weightMatch[1]) >= 600 : false;
}

function styleIncludesItalic(styleText = "") {
  const style = String(styleText).toLowerCase();
  return style.includes("font-style:italic") || style.includes("font-style: italic");
}

function appendChildren(sourceNode, targetNode, cleanNode) {
  Array.from(sourceNode.childNodes).forEach((child) => cleanNode(child, targetNode));
}

export function sanitizeComposerHtml(html = "") {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return String(html || "").replaceAll(FORMAT_BOUNDARY, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
  const sourceRoot = doc.body.firstElementChild;
  const outputDoc = document.implementation.createHTMLDocument("soldierhub-compose");
  const outputRoot = outputDoc.createElement("div");

  const cleanNode = (node, parent) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(
        outputDoc.createTextNode((node.textContent || "").replaceAll(FORMAT_BOUNDARY, ""))
      );
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName?.toUpperCase();
    const rawStyle = node.getAttribute?.("style") || "";
    const shouldForceBold = styleIncludesBold(rawStyle);
    const shouldForceItalic = styleIncludesItalic(rawStyle);

    // Google Docs, Word, Gmail, Apple Notes, and many mobile apps often paste
    // formatting as spans with inline styles. Convert only safe style signals
    // into clean SoldierHub markup; discard fonts, colors, sizes, classes, etc.
    if (!ALLOWED_EDITOR_TAGS.has(tagName)) {
      if (PARAGRAPH_LIKE_TAGS.has(tagName)) {
        const paragraph = outputDoc.createElement("p");
        appendChildren(node, paragraph, cleanNode);
        parent.appendChild(paragraph);
        return;
      }

      if (shouldForceBold || shouldForceItalic) {
        let wrapper = null;
        let currentParent = parent;

        if (shouldForceBold) {
          wrapper = outputDoc.createElement("strong");
          currentParent.appendChild(wrapper);
          currentParent = wrapper;
        }

        if (shouldForceItalic) {
          const em = outputDoc.createElement("em");
          currentParent.appendChild(em);
          currentParent = em;
        }

        appendChildren(node, currentParent, cleanNode);
        return;
      }

      appendChildren(node, parent, cleanNode);
      return;
    }

    const normalizedTag =
      tagName === "B" ? "strong" : tagName === "I" ? "em" : tagName.toLowerCase();
    const nextElement = outputDoc.createElement(normalizedTag);
    appendChildren(node, nextElement, cleanNode);

    let finalElement = nextElement;

    if (shouldForceBold && normalizedTag !== "strong") {
      const strong = outputDoc.createElement("strong");
      strong.appendChild(finalElement);
      finalElement = strong;
    }

    if (shouldForceItalic && normalizedTag !== "em") {
      const em = outputDoc.createElement("em");
      em.appendChild(finalElement);
      finalElement = em;
    }

    parent.appendChild(finalElement);
  };

  Array.from(sourceRoot?.childNodes || []).forEach((child) => cleanNode(child, outputRoot));

  return outputRoot.innerHTML.replaceAll(FORMAT_BOUNDARY, "").trim();
}

export function getPlainEditorText(editor) {
  return (editor?.innerText || "")
    .replaceAll(FORMAT_BOUNDARY, "")
    .replace(/\u00a0/g, " ")
    .trim();
}

export function safeRequestAnimationFrame(callback) {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    callback?.();
    return;
  }

  window.requestAnimationFrame(callback);
}

export function readSavedDraft(userId, draftKey) {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId || !parsed?.body) return null;

    return parsed;
  } catch {
    window.localStorage.removeItem(draftKey);
    return null;
  }
}

export function clearSavedDraft(draftKey) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(draftKey);
}
