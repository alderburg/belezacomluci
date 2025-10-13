import MobileTopBar from "@/components/mobile-top-bar";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import BannerCarousel from "@/components/banner-carousel";
import VideoCard from "@/components/video-card";
import ProductCard from "@/components/product-card";
import CouponCard from "@/components/coupon-card";
import EnhancedCarousel from "@/components/enhanced-carousel";
import { useQuery } from "@tanstack/react-query";
import { Video, Product, Coupon } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import { useState, useEffect } from "react";
import { PopupSystem } from "@/components/popup-system";
import { useAuth } from "@/hooks/use-auth";

export default function HomeMobilePage() {
  const { user } = useAuth();
  
  const [location, setLocation] = useLocation();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [modalContentType, setModalContentType] = useState<'video' | 'product' | 'coupon'>('product');
  const [modalContentTitle, setModalContentTitle] = useState<string | undefined>();

  // Scroll para o topo quando a página carrega
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Criar título personalizado baseado no gênero do usuário
  const getPersonalizedTitle = () => {
    if (!user) return "Início";
    
    const firstName = user.name?.split(' ')[0] || user.name;
    const greeting = user.gender === 'masculino' ? 'Bem-vindo' : 'Bem-vinda';
    
    return `${greeting} ${firstName}`;
  };

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
      window.history.replaceState({}, '', '/mobile');
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

  const handleMenuClick = () => {
    setLocation('/mobile-menu');
  };

  

  const handleNotificationClick = () => {
    // Implementar lógica de notificações
    console.log("Notifications clicked");
  };

  const handleUserClick = () => {
    // Implementar lógica do perfil
    console.log("User profile clicked");
  };

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden w-full"> {/* pb-20 para o bottom nav */}
      {/* Top Bar */}
      <MobileTopBar
        title={getPersonalizedTitle()}
        onMenuClick={handleMenuClick}
        onNotificationClick={handleNotificationClick}
        onUserClick={handleUserClick}
      />

      {/* Main Content */}
      <main className="overflow-x-hidden">
        {/* Hero Banner Carousel */}
        <BannerCarousel />

        {/* Content Sections */}
        <div className={`px-0 py-6 space-y-8 ${!hasActiveBanners ? 'pt-8' : ''} overflow-x-hidden w-full`}>
          {/* Latest Videos */}
          <section className="w-full">
            <div className="flex items-center justify-between mb-4 px-4">
              <h3 className="text-xl font-bold text-foreground">Novidades</h3>
              <Link href="/videos" className="text-primary hover:text-primary/80 font-medium text-sm">
                Ver todos
              </Link>
            </div>

            <EnhancedCarousel gap="gap-3" showArrows={false} itemWidth="w-full">
              {videosLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2 flex-shrink-0 w-[calc(100vw-2rem)] ml-4 first:ml-4">
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : latestVideos.length > 0 ? (
                latestVideos.map((video) => (
                  <div key={video.id} className="flex-shrink-0 w-[calc(100vw-2rem)] ml-4 first:ml-4">
                    <VideoCard video={video} />
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-8">
                  <p className="text-muted-foreground text-sm">Nenhum vídeo disponível no momento</p>
                </div>
              )}
            </EnhancedCarousel>
          </section>

          {/* Featured Products */}
          <section className="w-full">
            <div className="flex items-center justify-between mb-4 px-4">
              <h3 className="text-xl font-bold text-foreground">Produtos em Destaque</h3>
              <Link href="/produtos" className="text-primary hover:text-primary/80 font-medium text-sm">
                Ver todos
              </Link>
            </div>

            <EnhancedCarousel gap="gap-3" showArrows={false} itemWidth="w-full">
              {productsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2 flex-shrink-0 w-[calc(100vw-3rem)]">
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ))
              ) : featuredProducts.length > 0 ? (
                featuredProducts.map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-[calc(100vw-2rem)] ml-4 first:ml-4">
                    <ProductCard product={product} />
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-8">
                  <p className="text-muted-foreground text-sm">Nenhum produto disponível no momento</p>
                </div>
              )}
            </EnhancedCarousel>
          </section>

          {/* Hot Coupons */}
          <section className="w-full">
            <div className="flex items-center justify-between mb-4 px-4">
              <h3 className="text-xl font-bold text-foreground">Cupons em Destaque</h3>
              <Link href="/cupons" className="text-primary hover:text-primary/80 font-medium text-sm">
                Ver todos
              </Link>
            </div>

            <EnhancedCarousel gap="gap-3" showArrows={false} itemWidth="w-full">
              {couponsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[calc(100vw-3rem)]">
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                  </div>
                ))
              ) : hotCoupons.length > 0 ? (
                hotCoupons.map((coupon) => (
                  <div key={coupon.id} className="flex-shrink-0 w-[calc(100vw-2rem)] ml-4 first:ml-4">
                    <CouponCard coupon={coupon} />
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-8">
                  <p className="text-muted-foreground text-sm">Nenhum cupom disponível no momento</p>
                </div>
              )}
            </EnhancedCarousel>
          </section>
        </div>
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav />

      {/* Modals */}
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