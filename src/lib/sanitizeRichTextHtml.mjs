import sanitizeHtml from "sanitize-html";

const ALLOWED_RICH_TEXT_TAGS = [
  "a",
  "blockquote",
  "br",
  "div",
  "em",
  "li",
  "ol",
  "p",
  "strong",
  "ul",
];

export function normalizeRichTextHref(rawUrl = "") {
  const value = String(rawUrl || "").trim();
  if (!value) return null;

  const href = /^https?:\/\//i.test(value)
    ? value
    : /^www\./i.test(value)
      ? `https://${value}`
      : null;
  if (!href) return null;

  try {
    const parsed = new URL(href);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Sanitize user-authored rich text identically during SSR and in the browser.
 * Keep this function environment-independent: its output is injected into the
 * rendered page, so returning the original input is never a safe fallback.
 */
export function sanitizeRichTextHtml(html = "") {
  return sanitizeHtml(String(html || ""), {
    allowedTags: ALLOWED_RICH_TEXT_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    transformTags: {
      b: "strong",
      i: "em",
      a: (_tagName, attributes) => {
        const href = normalizeRichTextHref(attributes.href);

        if (!href) {
          return { tagName: "span", attribs: {} };
        }

        return {
          tagName: "a",
          attribs: {
            href,
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          },
        };
      },
    },
  }).trim();
}
