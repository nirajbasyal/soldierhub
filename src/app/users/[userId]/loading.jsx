"use client";

import { UserRound } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function UserProfileLoading() {
  return (
    <PageLoadingState
      title="Loading member profile"
      subtitle="Preparing this member profile and activity."
      icon={UserRound}
    />
  );
}
