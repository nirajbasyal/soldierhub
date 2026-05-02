"use client";
import { ArrowUpRight } from "lucide-react";
import { T } from "@/lib/theme";

export default function ResourceCard({ title, description, url, external }) {
  return (
    <a
      href={url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group rounded-2xl border p-4 md:p-5 flex items-start gap-3 transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="text-[15px] font-semibold leading-tight group-hover:underline"
          style={{ color: T.text }}
        >
          {title}
        </div>
        <p
          className="text-sm mt-1 leading-relaxed"
          style={{ color: T.textMuted }}
        >
          {description}
        </p>
      </div>
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors group-hover:bg-amber-50"
        style={{ backgroundColor: T.surface }}
      >
        <ArrowUpRight
          size={16}
          strokeWidth={2.25}
          style={{ color: T.gold }}
        />
      </div>
    </a>
  );
}
