import { Link2 } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function ResourcesLoading() {
  return (
    <PageLoadingState
      title="Loading resources"
      subtitle="Preparing helpful links and local support information."
      icon={Link2}
    />
  );
}
