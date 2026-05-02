"use client";
import { Check, Sparkles, X } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";

export default function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 left-4 md:left-auto z-[120] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="pointer-events-auto px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 min-w-[220px] max-w-md"
          style={{
            backgroundColor: T.card,
            borderColor: T.border,
            animation: "toastIn 200ms ease-out",
          }}
        >
          {t.tone === "success" && <Check size={16} style={{ color: T.green }} strokeWidth={2.5} />}
          {t.tone === "error"   && <X size={16} style={{ color: T.red }} strokeWidth={2.5} />}
          {t.tone === "info"    && <Sparkles size={16} style={{ color: T.gold }} strokeWidth={2.25} />}
          <span className="text-sm" style={{ color: T.text }}>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
