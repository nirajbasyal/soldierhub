import PageLoadingState from "@/components/ui/PageLoadingState";

export default function Loading() {
  return (
    <PageLoadingState
      title="Loading page"
      subtitle="Preparing the latest community updates."
      mode="page"
    />
  );
}
