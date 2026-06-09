import { BookOpen } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function BoardPrepLoading() {
  return (
    <PageLoadingState
      title="Loading Board Prep"
      subtitle="Preparing study cards, questions, and requests."
      icon={BookOpen}
    />
  );
}
