import { DoorOpen } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function GatesLoading() {
  return (
    <PageLoadingState
      title="Loading gate hours"
      subtitle="Preparing the latest saved gate information."
      icon={DoorOpen}
    />
  );
}
