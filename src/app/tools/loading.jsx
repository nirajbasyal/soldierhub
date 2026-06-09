"use client";

import { Wrench } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function ToolsLoading() {
  return (
    <PageLoadingState
      title="Loading tool"
      subtitle="Preparing this Soldier Hub tool."
      icon={Wrench}
      mode="page"
    />
  );
}
