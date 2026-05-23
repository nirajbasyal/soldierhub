import { FORMAT_BOUNDARY } from "./composerConstants";

const ALLOWED_EDITOR_TAGS = new Set([
  "B",
  "BLOCKQUOTE",
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

export function getAnonymousDisplayName(seed) {
  const source = String(seed || "anonymous");
  let total = 0;

  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }

  return `Anonymous${String(total % 10000).padStart(4, "0")}`;
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

    if (!ALLOWED_EDITOR_TAGS.has(tagName)) {
      Array.from(node.childNodes).forEach((child) => cleanNode(child, parent));
      return;
    }

    const normalizedTag =
      tagName === "B" ? "strong" : tagName === "I" ? "em" : tagName.toLowerCase();
    const nextElement = outputDoc.createElement(normalizedTag);
    Array.from(node.childNodes).forEach((child) => cleanNode(child, nextElement));
    parent.appendChild(nextElement);
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
