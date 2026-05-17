"use client";

import { useMemo, useState } from "react";
import { T } from "@/lib/theme";

function renderInlineFormatting(text) {
  if (!text) return null;

  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key} className="font-extrabold" style={{ color: T.text }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
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
                  {renderInlineFormatting(item)}
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
                  {renderInlineFormatting(item)}
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
                  {renderInlineFormatting(line)}
                </p>
              ))}
            </blockquote>
          );
        }

        return (
          <p key={`text-${index}`} className="whitespace-pre-wrap">
            {renderInlineFormatting(block.text)}
          </p>
        );
      })}
    </div>
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
  const isLong = safeText.length > previewLength;

  const visibleText =
    isLong && !expanded
      ? `${safeText.slice(0, previewLength).trim()}...`
      : safeText;

  if (!safeText) return null;

  return (
    <div>
      <FormattedText text={visibleText} className={className} style={style} />

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
