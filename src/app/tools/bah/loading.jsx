"use client";

import { Calculator } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function BahLoading() {
  return (
    <PageLoadingState
      title="Loading BAH calculator"
      subtitle="Preparing the Fort Bliss housing allowance estimate."
      icon={Calculator}
    />
  );
}
