"use client";

import { Compass } from "lucide-react";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import ToolPage from "@/components/ui/ToolPage";
import GateHoursCard from "@/components/tools/GateHoursCard";

export default function GatesToolPage() {
  return (
    <AppShell hideNav>
      <ToolPage title="Gate Hours" eyebrow="Fort Bliss" icon={Compass}>
        <GateHoursCard />
        <div
          className="rounded-2xl border p-5 mt-4"
          style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}
        >
          <div className="text-sm font-semibold mb-2" style={{ color: T.text }}>
            Heads up
          </div>
          <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
            Gate hours can change without notice for security exercises, holidays, or weather. Verify with the
            official Fort Bliss page or DPTMS before your commute, especially for early-morning PT runs and
            limited-hour gates.
          </p>
        </div>
        <Footer />
      </ToolPage>
    </AppShell>
  );
}
