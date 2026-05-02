"use client";
import { Sparkles } from "lucide-react";
import { T } from "@/lib/theme";

export default function Footer() {
  return (
    <footer className="mt-10 md:mt-14 pt-8 pb-4 border-t" style={{ borderColor: T.border }}>
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: T.navy }}>
            <Sparkles size={12} color={T.gold} strokeWidth={2.25} />
          </div>
          <span className="text-xs font-medium tracking-wider uppercase" style={{ color: T.navy }}>
            Soldier Hub
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: T.textSubtle }}>
          Soldier Hub is unofficial. Not affiliated with the Department of War.
        </p>
      </div>
    </footer>
  );
}
