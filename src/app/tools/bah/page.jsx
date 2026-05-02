"use client";

import { Calculator } from "lucide-react";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import ToolPage from "@/components/ui/ToolPage";
import BAHCard from "@/components/tools/BAHCard";

export default function BAHToolPage() {
  return (
    <AppShell hideNav>
      <ToolPage title="BAH Estimate" eyebrow="PCS Tools" icon={Calculator}>
        <BAHCard />
        <div
          className="rounded-2xl border p-5 mt-4"
          style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}
        >
          <div className="text-sm font-semibold mb-2" style={{ color: T.text }}>
            About these rates
          </div>
          <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
            These are reference Fort Bliss BAH rates for prototype use only. Actual rates change yearly and depend on
            your duty location ZIP code, rank, and dependent status. Always confirm with the official DoD BAH
            calculator and your finance office before making housing decisions.
          </p>
        </div>
        <Footer />
      </ToolPage>
    </AppShell>
  );
}
