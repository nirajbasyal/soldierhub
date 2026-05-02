"use client";

import { ArrowLeft, BookMarked } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { RESOURCES } from "@/lib/resources";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import ResourceCard from "@/components/resources/ResourceCard";

export default function ResourcesPage() {
  const router = useRouter();

  return (
    <AppShell hideNav>
      <main className="min-h-screen pb-24 md:pb-12" style={{ backgroundColor: T.bg }}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => router.push("/")}
          >
            Back to feed
          </Button>

          <div className="mt-6 mb-7">
            <div className="flex items-center gap-2 mb-1">
              <BookMarked size={16} style={{ color: T.gold }} />
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: T.gold }}
              >
                Fort Bliss
              </span>
            </div>
            <h1
              className="text-3xl md:text-4xl leading-tight font-serif"
              style={{ color: T.navy }}
            >
              Resources
            </h1>
            <p
              className="text-[15px] mt-3 leading-relaxed max-w-2xl"
              style={{ color: T.textMuted }}
            >
              Official sites and trusted services every Fort Bliss soldier and
              family member should bookmark. All links open the official source.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {RESOURCES.map((section) => (
              <section key={section.category}>
                <h2
                  className="text-[11px] font-semibold uppercase tracking-wider mb-3 px-1"
                  style={{ color: T.textSubtle }}
                >
                  {section.category}
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {section.items.map((r) => (
                    <ResourceCard key={r.title} {...r} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div
            className="rounded-2xl border p-5 mt-8"
            style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}
          >
            <div className="text-sm font-semibold mb-1" style={{ color: T.text }}>
              Have a resource we missed?
            </div>
            <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
              Soldier Hub is community-built. Post your suggestion in the feed
              with the tag <span style={{ color: T.text, fontWeight: 600 }}>General Q&amp;A</span>{" "}
              and we&apos;ll review it for inclusion.
            </p>
          </div>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
