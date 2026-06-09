"use client";

import { Shield } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function AdminLoading() {
  return (
    <PageLoadingState
      title="Securing admin"
      subtitle="Checking your login and admin permissions."
      icon={Shield}
      mode="admin"
    />
  );
}
