"use client";
import { useState } from "react";
import { T } from "@/lib/theme";

export default function IconButton({ icon: Icon, label, onClick, count, active }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={label}
      className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-sm font-medium transition-colors"
      style={{
        backgroundColor: active ? T.goldBg : (hover ? T.borderSoft : "transparent"),
        color: active ? T.gold : T.textMuted,
      }}
    >
      <Icon size={16} strokeWidth={2.25} />
      {typeof count === "number" && count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
