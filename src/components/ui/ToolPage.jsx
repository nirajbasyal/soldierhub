"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import Button from "./Button";

export default function ToolPage({ title, eyebrow, icon: Icon, children }) {
  const router = useRouter();
  return (
    <div className="min-h-screen pb-24 md:pb-12" style={{ backgroundColor: T.bg }}>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/")}>
          Back to feed
        </Button>
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
