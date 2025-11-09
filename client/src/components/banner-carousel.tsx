import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Banner } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface BannerCarouselProps {
  page?: string;
  courseId?: string;
  videoId?: string;
}

export default function BannerCarousel({ page = "home", courseId, videoId }: BannerCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Determinar a query key baseado no tipo de banner
  const queryKey = courseId 
    ? [`/api/banners/course/${courseId}`] 
    : videoId 
      ? [`/api/banners/video/${videoId}`]
      : ["/api/banners"];

  const { data: banners, isLoading } = useQuery<Banner[]>({
    queryKey,
  });

  // Função para verificar se o link é interno
  const isInternalLink = (url: string) => {
    if (!url) return false;
    
    // Remove protocol and www for comparison
    const currentDomain = window.location.hostname.replace('www.', '');
    
    try {
      const linkUrl = new URL(url);
      const linkDomain = linkUrl.hostname.replace('www.', '');
      
      // Check if it's the same domain or a relative path
      return linkDomain === currentDomain || url.startsWith('/');
    } catch {
      // If URL parsing fails, assume it's a relative path (internal)
      return url.startsWith('/');
    }
  };

  // Função para lidar com navegação
  const handleNavigation = (url: string) => {
    if (isInternalLink(url)) {
      // Navegação interna usando wouter
      if (url.startsWith('/')) {
        setLocation(url);
      } else {
        // Extract path from full internal URL
        try {
          const urlObj = new URL(url);
          setLocation(urlObj.pathname);
        } catch {
          console.error('Failed to parse internal URL:', url);
        }
      }
    } else {
      // Link externo - abrir em nova guia
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const activeBanners = banners?.filter(banner => banner.isActive && banner.page === page) || [];

  // Auto-rotate banners
  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((current) => (current + 1) % activeBanners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeBanners.length]);

  const nextSlide = () => {
    setCurrentSlide((current) => (current + 1) % activeBanners.length);
  };

  const prevSlide = () => {
    setCurrentSlide((current) => (current - 1 + activeBanners.length) % activeBanners.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  if (isLoading) {
    return (
      <section className="relative h-80 md:h-96 overflow-hidden">
        <Skeleton className="w-full h-full" />
      </section>
    );
  }

  if (!activeBanners.length) {
    return null;
  }

  return (
    <section className={`relative h-64 md:h-96 overflow-hidden w-full ${isMobile ? 'mt-0' : 'mt-16'}`}>
      <div className="relative w-full h-full">
        {activeBanners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {banner.linkUrl ? (
              <div
                onClick={() => handleNavigation(banner.linkUrl)}
                className="block w-full h-full cursor-pointer"
                data-testid={`banner-link-${index}`}
              >
                <div
                  className={`w-full h-full flex items-center justify-center bg-cover bg-center relative ${
                    !banner.imageUrl ? 'bg-gradient-to-r from-pink-500 to-purple-600' : ''
                  }`}
                  style={banner.imageUrl ? {
                    backgroundImage: banner.showTitle !== false || banner.showDescription !== false || banner.showButton !== false
                      ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${banner.imageUrl})`
                      : `url(${banner.imageUrl})`
                  } : {}}
                  data-testid={`banner-slide-${index}`}
                >
                  {/* Overlay pattern for visual appeal - only when showing text elements */}
                  {(banner.showTitle !== false || banner.showDescription !== false || banner.showButton !== false) && (
                    <div className="absolute inset-0 bg-black/40"></div>
                  )}
                  <div className="container mx-auto px-6 text-center text-white relative z-10 pointer-events-none">
                    {banner.showTitle !== false && (
                      <h2 className="text-4xl md:text-6xl font-bold mb-4">
                        {banner.title}
                      </h2>
                    )}
                    {banner.showDescription !== false && banner.description && (
                      <p className="text-xl mb-8">
                        {banner.description}
                      </p>
                    )}
                    {banner.showButton !== false && banner.linkUrl && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigation(banner.linkUrl);
                        }}
                        className="bg-white text-primary px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors pointer-events-auto"
                        data-testid={`banner-button-${index}`}
                      >
                        Saiba Mais
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center bg-cover bg-center relative ${
                  !banner.imageUrl ? 'bg-gradient-to-r from-pink-500 to-purple-600' : ''
                }`}
                style={banner.imageUrl ? {
                  backgroundImage: banner.showTitle !== false || banner.showDescription !== false || banner.showButton !== false
                    ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${banner.imageUrl})`
                    : `url(${banner.imageUrl})`
                } : {}}
                data-testid={`banner-slide-${index}`}
              >
                {/* Overlay pattern for visual appeal - only when showing text elements */}
                {(banner.showTitle !== false || banner.showDescription !== false || banner.showButton !== false) && (
                  <div className="absolute inset-0 bg-black/40"></div>
                )}
                <div className="container mx-auto px-6 text-center text-white relative z-10">
                  {banner.showTitle !== false && (
                    <h2 className="text-4xl md:text-6xl font-bold mb-4">
                      {banner.title}
                    </h2>
                  )}
                  {banner.showDescription !== false && banner.description && (
                    <p className="text-xl mb-8">
                      {banner.description}
                    </p>
                  )}
                  {banner.showButton !== false && banner.linkUrl && (
                    <Button
                      onClick={() => handleNavigation(banner.linkUrl)}
                      className="bg-white text-primary px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
                      data-testid={`banner-button-${index}`}
                    >
                      Saiba Mais
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      {activeBanners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-20 backdrop-blur-sm"
            onClick={prevSlide}
            data-testid="button-prev-banner"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-20 backdrop-blur-sm"
            onClick={nextSlide}
            data-testid="button-next-banner"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {activeBanners.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-opacity ${
                  index === currentSlide ? 'bg-white opacity-100' : 'bg-white/50 opacity-70'
                } hover:opacity-100`}
                onClick={() => goToSlide(index)}
                data-testid={`banner-indicator-${index}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}