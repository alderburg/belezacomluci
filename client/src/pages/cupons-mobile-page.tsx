import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Tag, Percent, Search, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Coupon } from "@shared/schema";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import CouponCard from "@/components/coupon-card";
import BannerCarousel from "@/components/banner-carousel";
import { toEpochMs } from "@/lib/time";

export default function CuponsMobilePage() {
  
  const [location, setLocation] = useLocation();
  const [category, setCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Scroll para o topo quando a página carrega
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const handleBackClick = () => {
    setLocation('/');
  };

  const { data: banners } = useQuery<any[]>({
    queryKey: ["/api/banners"],
  });

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const activeBanners = banners?.filter((banner: any) => banner.isActive && banner.page === "coupons") || [];
  const hasActiveBanners = activeBanners.length > 0;

  const filteredCoupons = coupons?.filter((coupon) => {
    const matchesCategory = !category || category === "all" || coupon.categoryId === category;
    const matchesBrand = !searchTerm ||
      coupon.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Mostrar cupons que estão ativos (inclui expirados, programados e ativos)
    // Na página mobile, seguir o mesmo padrão da desktop: mostrar todos os cupons ativos independente do status temporal
    const shouldShow = coupon.isActive;

    return matchesCategory && matchesBrand && shouldShow;
  }) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Cupons</h1>
            <p className="text-sm text-muted-foreground">Descontos especiais em marcas favoritas</p>
          </div>
          <Tag className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Banner */}
      <div className="pt-16 w-full">
        {hasActiveBanners && <BannerCarousel page="coupons" />}
      </div>

      {/* Content Section */}
      <div className="px-4 py-6">
        {/* Filtros */}
        <div className="mb-6">
          {/* Linha principal com pesquisa e filtros */}
          <div className="flex gap-2 mb-4">
            {/* Campo de pesquisa */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Botão de filtros */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (showFilters) {
                  // Se está fechando os filtros, limpar os valores
                  setCategory("");
                }
                setShowFilters(!showFilters);
              }}
              className={`flex-shrink-0 ${showFilters ? 'bg-yellow-400 hover:bg-yellow-500 border-yellow-400' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </Button>
          </div>

          

          {/* Filtros expansíveis */}
          {showFilters && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
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
            </div>
          )}
        </div>

        {/* Lista de Cupons */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredCoupons.length > 0 ? (
          <div className="space-y-4">
            {filteredCoupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Coupons Badge - Apenas quando não há cupons */}
            <div className="bg-gradient-to-r from-orange-100/80 to-red-100/80 border border-orange-200/80 rounded-xl p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full shadow-lg">
                  <Percent className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Conteúdo Exclusivo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Descontos exclusivos em suas marcas favoritas de beleza e cuidados pessoais
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}