"use client";

import { useState } from "react";
import { T } from "@/lib/theme";

export default function ExpandableText({
  text = "",
  previewLength = 260,
  className = "text-sm leading-relaxed whitespace-pre-wrap",
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
      <p className={className} style={style}>
        {visibleText}
      </p>

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