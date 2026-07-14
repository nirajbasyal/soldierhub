"use client";

import { useMemo, useState } from "react";
import { T } from "@/lib/theme";
import { sanitizeRichTextHtml } from "@/lib/sanitizeRichTextHtml.mjs";

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_URL_PUNCTUATION = /[.,!?;:)\]}]+$/;

function looksLikeHtml(text = "") {
  return /<\/?(a|p|div|strong|em|ul|ol|li|blockquote|br)\b/i.test(String(text));
}

function splitUrlAndTrailingPunctuation(rawUrl = "") {
  const value = String(rawUrl || "");
  const match = value.match(TRAILING_URL_PUNCTUATION);

  if (!match) return { url: value, suffix: "" };

  return {
    url: value.slice(0, -match[0].length),
    suffix: match[0],
  };
}

function normalizeHref(rawUrl = "") {
  const { url } = splitUrlAndTrailingPunctuation(rawUrl.trim());
  if (!url) return null;

  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  try {
    const parsed = new URL(href);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function getCompactLinkLabel(rawUrl = "") {
  const href = normalizeHref(rawUrl);
  if (!href) return String(rawUrl || "");

  try {
    const parsed = new URL(href);
    const host = parsed.hostname.replace(/^www\./i, "");
    const hasMore =
      (parsed.pathname && parsed.pathname !== "/") || Boolean(parsed.search) || Boolean(parsed.hash);

    return hasMore ? `${host}/...` : host;
  } catch {
    return String(rawUrl || "");
  }
}

function htmlToPlainText(html = "") {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
  return (doc.body.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function SmartLink({ rawUrl = "", children = null }) {
  const href = normalizeHref(rawUrl);
  if (!href) return children || rawUrl;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="break-words font-semibold underline decoration-[#7EA4C5] underline-offset-2"
      style={{ color: "#245B8F" }}
    >
      {children || getCompactLinkLabel(href)}
    </a>
  );
}

function renderInlineFormatting(text, keyPrefix = "inline") {
  if (!text) return null;

  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|(?:https?:\/\/|www\.)[^\s<>"']+)/gi;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${match.index}-${token}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key} className="font-extrabold" style={{ color: T.text }}>
          {renderInlineFormatting(token.slice(2, -2), `${key}-bold`)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={key} className="italic">
          {renderInlineFormatting(token.slice(1, -1), `${key}-italic`)}
        </em>
      );
    } else {
      const { url, suffix } = splitUrlAndTrailingPunctuation(token);
      parts.push(
        <span key={key}>
          <SmartLink rawUrl={url} />
          {suffix}
        </span>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

function getLineType(line) {
  if (/^\s*>\s?/.test(line)) return "quote";
  if (/^\s*[-*•]\s+/.test(line)) return "bullet";
  if (/^\s*\d+[.)]\s+/.test(line)) return "number";
  if (!line.trim()) return "blank";
  return "text";
}

function parseFormattedBlocks(text) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const type = getLineType(line);

    if (type === "blank") {
      index += 1;
      continue;
    }

    if (type === "bullet") {
      const items = [];
      while (index < lines.length && getLineType(lines[index]) === "bullet") {
        items.push(lines[index].replace(/^\s*[-*•]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "bullet", items });
      continue;
    }

    if (type === "number") {
      const items = [];
      while (index < lines.length && getLineType(lines[index]) === "number") {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "number", items });
      continue;
    }

    if (type === "quote") {
      const items = [];
      while (index < lines.length && getLineType(lines[index]) === "quote") {
        items.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: items.join("\n") });
      continue;
    }

    const paragraphs = [];
    while (index < lines.length && ["text", "blank"].includes(getLineType(lines[index]))) {
      if (getLineType(lines[index]) === "blank") {
        index += 1;
        break;
      }
      paragraphs.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "text", text: paragraphs.join("\n") });
  }

  return blocks;
}

function FormattedText({ text = "", className = "text-sm leading-relaxed", style = {} }) {
  const blocks = useMemo(() => parseFormattedBlocks(text), [text]);

  if (!text) return null;

  return (
    <div className={`space-y-3 ${className}`} style={style}>
      {blocks.map((block, index) => {
        if (block.type === "bullet") {
          return (
            <ul key={`bullet-${index}`} className="ml-5 list-disc space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`} className="pl-1">
                  {renderInlineFormatting(item, `bullet-${index}-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "number") {
          return (
            <ol key={`number-${index}`} className="ml-5 list-decimal space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`} className="pl-1">
                  {renderInlineFormatting(item, `number-${index}-${itemIndex}`)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={`quote-${index}`}
              className="rounded-2xl border-l-4 px-4 py-3 text-[0.95em] font-medium"
              style={{
                backgroundColor: "rgba(244,248,253,0.86)",
                borderLeftColor: T.navy,
                color: T.textMuted,
              }}
            >
              {block.text.split("\n").map((line, lineIndex) => (
                <p key={`${index}-${lineIndex}`} className={lineIndex > 0 ? "mt-1" : ""}>
                  {renderInlineFormatting(line, `quote-${index}-${lineIndex}`)}
                </p>
              ))}
            </blockquote>
          );
        }

        return (
          <p key={`text-${index}`} className="whitespace-pre-wrap">
            {renderInlineFormatting(block.text, `text-${index}`)}
          </p>
        );
      })}
    </div>
  );
}

function RichHtmlText({ html = "", className = "text-sm leading-relaxed", style = {} }) {
  const safeHtml = useMemo(() => sanitizeRichTextHtml(html), [html]);

  if (!safeHtml) return null;

  return (
    <div
      className={`${className} space-y-3 [&_a]:break-words [&_a]:font-semibold [&_a]:text-[#245B8F] [&_a]:underline [&_a]:decoration-[#7EA4C5] [&_a]:underline-offset-2 [&_blockquote]:rounded-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-[#0B1C2C] [&_blockquote]:bg-[#F4F8FD] [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:font-medium [&_em]:italic [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_p]:whitespace-pre-wrap [&_strong]:font-extrabold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5`}
      style={style}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

export default function ExpandableText({
  text = "",
  previewLength = 260,
  className = "text-sm leading-relaxed",
  style = {},
  buttonSize = "sm",
}) {
  const [expanded, setExpanded] = useState(false);

  const safeText = text || "";
  const isHtml = looksLikeHtml(safeText);
  const plainText = isHtml ? htmlToPlainText(safeText) : safeText;
  const isLong = plainText.length > previewLength;
  const previewMaxHeight = buttonSize === "xs" ? 112 : 236;

  const visiblePlainText =
    isLong && !expanded && !isHtml
      ? `${safeText.slice(0, previewLength).trim()}...`
      : safeText;

  if (!safeText) return null;

  return (
    <div>
      {isHtml ? (
        <div
          className="relative"
          style={
            isLong && !expanded
              ? { maxHeight: previewMaxHeight, overflow: "hidden" }
              : undefined
          }
        >
          <RichHtmlText html={safeText} className={className} style={style} />
          {isLong && !expanded ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
              style={{
                background:
                  "linear-gradient(180deg, rgba(253,254,255,0) 0%, rgba(253,254,255,0.92) 72%, rgba(253,254,255,1) 100%)",
              }}
            />
          ) : null}
        </div>
      ) : (
        <FormattedText text={visiblePlainText} className={className} style={style} />
      )}

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={`mt-2 font-semibold ${
            buttonSize === "xs" ? "text-xs" : "text-sm"
          }`}
          style={{ color: T.navy }}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
