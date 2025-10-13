import Sidebar from "@/components/sidebar";
import BannerCarousel from "@/components/banner-carousel";
import VideoCard from "@/components/video-card";
import ProductCard from "@/components/product-card";
import CouponCard from "@/components/coupon-card";
import EnhancedCarousel from "@/components/enhanced-carousel";
import { useQuery } from "@tanstack/react-query";
import { Video, Product, Coupon } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import { useState, useEffect } from "react";
import { PopupSystem } from "@/components/popup-system";

export default function HomePage() {
  const isMobile = useIsMobile();
  const [location, navigate] = useLocation();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [modalContentType, setModalContentType] = useState<'video' | 'product' | 'coupon'>('product');
  const [modalContentTitle, setModalContentTitle] = useState<string | undefined>();

  // Check if we should show premium modal based on URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showPremiumModal') === 'true') {
      setShowPremiumModal(true);

      // Captura o tipo e título do conteúdo se disponível
      const contentType = urlParams.get('contentType') as 'video' | 'product' | 'coupon';
      const contentTitle = urlParams.get('contentTitle');

      if (contentType) setModalContentType(contentType);
      if (contentTitle) setModalContentTitle(decodeURIComponent(contentTitle));

      // Clean up URL without reloading
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const { data: videos, isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: coupons, isLoading: couponsLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const { data: banners } = useQuery({
    queryKey: ["/api/banners"],
  });

  const latestVideos = videos?.slice(0, 10) || [];
  // Filtrar apenas produtos ativos para o carrossel
  const featuredProducts = products?.filter(product => product.isActive)?.slice(0, 10) || [];
  // Filtrar apenas cupons ativos para o carrossel (cupons expirados mas ativos ainda aparecem)
  const hotCoupons = coupons?.filter(coupon => coupon.isActive)?.slice(0, 10) || [];

  // Verificar se há banners ativos na página home
  const activeBanners = banners?.filter((banner: any) => banner.isActive && banner.page === "home") || [];
  const hasActiveBanners = activeBanners.length > 0;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 overflow-x-hidden ${isMobile ? 'ml-0' : ''}`}>
        {/* Hero Banner Carousel */}
        <BannerCarousel />

        {/* Content Sections */}
        <div className={`container mx-auto px-6 py-8 space-y-12 ${!hasActiveBanners ? (isMobile ? 'pt-32' : 'pt-20') : ''}`}>
          {/* Latest Videos */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-foreground">Novidades</h3>
              <Link href="/videos" className="text-primary hover:text-primary/80 font-medium" data-testid="link-all-videos">
                Ver todos
              </Link>
            </div>

            <EnhancedCarousel>
              {videosLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-[380px] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : latestVideos.length > 0 ? (
                latestVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))
              ) : (
                <div className="w-full text-center py-12">
                  <p className="text-muted-foreground">Nenhum vídeo disponível no momento</p>
                </div>
              )}
            </EnhancedCarousel>
          </section>

          {/* Featured Products */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-foreground">Produtos em Destaque</h3>
              <Link href="/produtos" className="text-primary hover:text-primary/80 font-medium" data-testid="link-all-products">
                Ver todos
              </Link>
            </div>

            <EnhancedCarousel>
              {productsLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-[380px] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))
              ) : featuredProducts.length > 0 ? (
                featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                <div className="w-full text-center py-12">
                  <p className="text-muted-foreground">Nenhum produto disponível no momento</p>
                </div>
              )}
            </EnhancedCarousel>
          </section>

          {/* HotCoupons */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-foreground">Cupons em Destaque</h3>
              <Link href="/cupons" className="text-primary hover:text-primary/80 font-medium" data-testid="link-all-coupons">
                Ver todos
              </Link>
            </div>

            <EnhancedCarousel>
              {couponsLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-[380px] w-full rounded-lg" />
                  </div>
                ))
              ) : hotCoupons.length > 0 ? (
                hotCoupons.map((coupon) => (
                  <CouponCard key={coupon.id} coupon={coupon} />
                ))
              ) : (
                <div className="w-full text-center py-12">
                  <p className="text-muted-foreground">Nenhum cupom disponível no momento</p>
                </div>
              )}
            </EnhancedCarousel>
          </section>
        </div>
      </main>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        contentType={modalContentType}
        contentTitle={modalContentTitle}
      />
      <PopupSystem trigger="page_specific" targetPage="home" />
    </div>
  );
}