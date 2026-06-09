import { MessageSquareText } from "lucide-react";
import PageLoadingState from "@/components/ui/PageLoadingState";

export default function PostDetailLoading() {
  return (
    <PageLoadingState
      title="Loading post"
      subtitle="Opening the discussion and comments."
      icon={MessageSquareText}
    />
  );
}
