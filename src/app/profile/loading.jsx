"use client";

import { User } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function ProfileLoading() {
  return (
    <PageLoadingState
      title="Loading profile"
      subtitle="Preparing your profile and recent activity."
      icon={User}
    />
  );
}
