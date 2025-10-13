import { useMobileDetection } from "@/contexts/mobile-detection-context";
import CouponsPage from "./coupons-page";
import CuponsMobilePage from "./cupons-mobile-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResponsiveCouponsPage() {
  const { isMobile, isDetected } = useMobileDetection();

  // Só mostra skeleton na primeira detecção (quando nunca foi detectado antes)
  if (!isDetected || isMobile === undefined) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton para header/banner */}
        <div className="w-full h-64 bg-gray-100">
          <Skeleton className="w-full h-full" />
        </div>
        {/* Skeleton para conteúdo principal */}
        <div className="container mx-auto px-6 py-8 space-y-12">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Após detecção, renderiza imediatamente sem skeleton
  if (isMobile) {
    return <CuponsMobilePage />;
  }

  return <CouponsPage />;
}