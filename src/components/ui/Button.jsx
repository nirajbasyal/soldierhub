"use client";
import { useState } from "react";
import { T } from "@/lib/theme";

const SIZES = {
  sm: "h-8 px-3 text-sm rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-5 text-base rounded-xl gap-2",
  icon: "h-10 w-10 rounded-xl justify-center",
  iconSm: "h-8 w-8 rounded-lg justify-center",
};

const VARIANTS = {
  primary:     { bg: T.red,     color: "#fff",  border: T.red,     hover: "#951534" },
  gold:        { bg: T.blue,    color: "#fff",  border: T.blue,    hover: "#173F73" },
  secondary:   { bg: T.card,    color: T.navy,  border: T.border,  hover: T.surface },
  ghost:       { bg: "transparent", color: T.text, border: "transparent", hover: T.borderSoft },
  danger:      { bg: T.red,     color: "#fff",  border: T.red,     hover: "#951534" },
  softDanger:  { bg: T.redBg,   color: T.red,   border: T.redBg,   hover: "#F7D6DE" },
  softSuccess: { bg: T.greenBg, color: T.green, border: T.greenBg, hover: "#d3e9dc" },
};

export default function Button({
  variant = "primary", size = "md", icon: Icon, iconRight: IconRight,
  children, className = "", ...props
}) {
  const v = VARIANTS[variant];
  const [hover, setHover] = useState(false);
  return (
    <button
      {...props}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`sh-interactive sh-focus-ring inline-flex items-center justify-center font-semibold border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${SIZES[size]} ${className}`}
      style={{
        backgroundColor: hover && !props.disabled ? v.hover : v.bg,
        color: v.color,
        borderColor: v.border,
        boxShadow:
          variant === "primary" && !props.disabled
            ? hover
              ? "0 13px 26px rgba(179,25,66,0.24)"
              : "0 10px 22px rgba(179,25,66,0.20)"
            : undefined,
      }}
    >
      {Icon && <Icon size={size === "lg" ? 18 : 16} strokeWidth={2.25} />}
      {children}
      {IconRight && <IconRight size={size === "lg" ? 18 : 16} strokeWidth={2.25} />}
    </button>
  );
}
