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
          className="sh-toast-card sh-tap pointer-events-auto w-full md:w-auto px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-2.5 min-w-[220px] max-w-md cursor-pointer"
          style={{
            backgroundColor: "rgba(253,254,255,0.98)",
            borderColor: T.border,
            boxShadow: "0 16px 34px rgba(7,27,51,0.13)",
          }}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                t.tone === "success" ? T.greenBg : t.tone === "error" ? T.redBg : T.goldBg,
            }}
          >
            {t.tone === "success" && <Check size={15} style={{ color: T.green }} strokeWidth={2.7} />}
            {t.tone === "error" && <X size={15} style={{ color: T.red }} strokeWidth={2.7} />}
            {t.tone === "info" && <Sparkles size={15} style={{ color: T.gold }} strokeWidth={2.35} />}
          </div>
          <span className="text-sm font-semibold leading-5" style={{ color: T.text }}>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
