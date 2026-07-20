"use client";

import { Ruler } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import ToolPage from "@/components/ui/ToolPage";
import WHtRCalculator from "@/components/tools/WHtRCalculator";

export default function WHtRToolPage() {
  return (
    <AppShell hideNav>
      <ToolPage title="Waist-to-Height Ratio" eyebrow="Soldier Tools" icon={Ruler}>
        <WHtRCalculator />
        <Footer />
      </ToolPage>
    </AppShell>
  );
}
