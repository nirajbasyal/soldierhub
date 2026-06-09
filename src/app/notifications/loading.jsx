import { Bell } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function NotificationsLoading() {
  return (
    <PageLoadingState
      title="Loading notifications"
      subtitle="Checking your latest alerts and replies."
      icon={Bell}
    />
  );
}
