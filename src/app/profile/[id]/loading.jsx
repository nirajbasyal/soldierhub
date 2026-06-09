import { UserRound } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function ProfileDetailLoading() {
  return (
    <PageLoadingState
      title="Loading profile"
      subtitle="Preparing this profile and activity."
      icon={UserRound}
    />
  );
}
