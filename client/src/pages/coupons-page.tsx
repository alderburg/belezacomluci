import Sidebar from "@/components/sidebar";
import CouponCard from "@/components/coupon-card";
import BannerCarousel from "@/components/banner-carousel";
import { useQuery } from "@tanstack/react-query";
import { Coupon } from "@shared/schema";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainContent } from "@/components/main-content";
import { PopupSystem } from "@/components/popup-system";
import { toEpochMs } from "@/lib/time";

export default function CouponsPage() {
  const isMobile = useIsMobile();
  const [category, setCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: banners } = useQuery<any[]>({
    queryKey: ["/api/banners"],
  });

  // Verificar se há banners ativos na página coupons
  const activeBanners = banners?.filter((banner: any) => banner.isActive && banner.page === "coupons") || [];
  const hasActiveBanners = activeBanners.length > 0;

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const filteredCoupons = coupons?.filter((coupon) => {
    const matchesCategory = !category || category === "all" || coupon.categoryId === category;
    const matchesBrand = !searchTerm ||
      coupon.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.description.toLowerCase().includes(searchTerm.toLowerCase());

    // Mostrar cupons que estão ativos (inclui expirados, programados e ativos)
    const shouldShow = coupon.isActive;

    return matchesCategory && matchesBrand && shouldShow;
  }) || [];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : ''}`}>
        <BannerCarousel page="coupons" />
        <PopupSystem trigger="page_specific" targetPage="coupons" />
        <div className={`container mx-auto px-6 ${hasActiveBanners ? 'py-8' : (isMobile ? 'pt-20 pb-8' : 'pt-20 pb-8')}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
            <h2 className="text-3xl font-bold text-foreground">Cupons de Desconto</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-coupon-category">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories?.filter(cat => cat.isActive).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                  data-testid="input-search-coupons"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-6 w-20 rounded" />
                    <Skeleton className="h-8 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCoupons.length > 0 ? (
            <div className="uniform-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCoupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm || category ?
                  "Nenhum cupom encontrado com os filtros aplicados" :
                  "Nenhum cupom disponível no momento"
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}