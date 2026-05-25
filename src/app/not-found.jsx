import ProductionFallback from "@/components/ui/ProductionFallback";

export const metadata = {
  title: "Page not found · Soldier Hub",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return <ProductionFallback variant="notFound" showRefresh={false} />;
}
