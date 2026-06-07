"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";

export default function ToolPage({ title, eyebrow, icon: Icon, children, onBack, backLabel = "Go back" }) {
  const router = useRouter();
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.push("/");
  };

  return (
    <div className="min-h-screen pb-8 md:pb-12" style={{ backgroundColor: T.bg }}>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D5E2F2] bg-white text-[#0B1C2C] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4E8C]/35"
          aria-label={backLabel}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="mt-6 md:mt-8 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Icon size={16} style={{ color: T.gold }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: T.gold }}>
              {eyebrow}
            </span>
          </div>
          <h1
            className="text-3xl md:text-4xl leading-tight font-serif"
            style={{ color: T.navy }}
          >
            {title}
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
