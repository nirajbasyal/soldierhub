"use client";

import { ExternalLink } from "lucide-react";
import { T } from "@/lib/theme";

export default function ResourceCard({
  title,
  description,
  url,
  link,
}) {
  const href = url || link || "#";
  const hasLink = href && href !== "#";

  return (
    <a
      href={hasLink ? href : undefined}
      target={hasLink ? "_blank" : undefined}
      rel={hasLink ? "noopener noreferrer" : undefined}
      className="group rounded-2xl border p-5 md:p-6 flex items-center justify-between gap-4 transition-all hover:shadow-sm"
      style={{
        backgroundColor: T.card,
        borderColor: T.border,
        textDecoration: "none",
      }}
      onClick={(e) => {
        if (!hasLink) {
          e.preventDefault();
        }
      }}
    >
      <div className="min-w-0">
        <h3
          className="text-lg font-semibold leading-snug"
          style={{ color: T.text }}
        >
          {title}
        </h3>

        {description ? (
          <p
            className="text-sm md:text-[15px] mt-2 leading-relaxed"
            style={{ color: T.textMuted }}
          >
            {description}
          </p>
        ) : null}
      </div>

      <div
        className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{
          backgroundColor: T.surface,
          color: T.gold,
        }}
      >
        <ExternalLink size={20} strokeWidth={2.25} />
      </div>
    </a>
  );
}