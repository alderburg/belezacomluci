
import { useState, useEffect, useRef } from "react";
import { Search, X, Video, Package, Tag, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Video as VideoType, Product, Coupon } from "@shared/schema";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'product' | 'coupon';
  url: string;
  imageUrl?: string;
  brand?: string;
  code?: string;
  isExclusive?: boolean;
}

interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSearch({ isOpen, onClose }: MobileSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  // Queries para buscar dados
  const { data: videos } = useQuery<VideoType[]>({
    queryKey: ["/api/videos"],
    enabled: isOpen,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isOpen,
  });

  const { data: coupons } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
    enabled: isOpen,
  });

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Limpar pesquisa quando fechar
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSearchResults([]);
    }
  }, [isOpen]);

  // Função de pesquisa
  useEffect(() => {
    if (!searchTerm.trim() || !videos || !products || !coupons) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    const searchLower = searchTerm.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Palavras-chave para buscar por tipo de conteúdo (busca parcial)
    const isVideoSearch = 
      'video'.includes(searchLower) || 'vídeo'.includes(searchLower) || 'filme'.includes(searchLower) ||
      searchLower.includes('video') || searchLower.includes('vídeo') || searchLower.includes('filme');
    
    const isProductSearch = 
      'produto'.includes(searchLower) || 'item'.includes(searchLower) ||
      searchLower.includes('produto') || searchLower.includes('item');
    
    const isCouponSearch = 
      'cupom'.includes(searchLower) || 'desconto'.includes(searchLower) || 
      'promocao'.includes(searchLower) || 'promoção'.includes(searchLower) ||
      searchLower.includes('cupom') || searchLower.includes('desconto') || 
      searchLower.includes('promocao') || searchLower.includes('promoção');

    // Busca por badges/status (busca parcial)
    const isPremiumSearch = 
      'premium'.includes(searchLower) || 'premiun'.includes(searchLower) || 'premim'.includes(searchLower) ||
      searchLower.includes('premium') || searchLower.includes('premiun') || searchLower.includes('premim');
    
    const isFreeSearch = 
      'free'.includes(searchLower) || 'gratis'.includes(searchLower) || 'gratuito'.includes(searchLower) ||
      searchLower.includes('free') || searchLower.includes('gratis') || searchLower.includes('gratuito');
    
    const isExclusiveSearch = 
      'exclusivo'.includes(searchLower) || 'exclusiva'.includes(searchLower) || 'especial'.includes(searchLower) ||
      searchLower.includes('exclusivo') || searchLower.includes('exclusiva') || searchLower.includes('especial');

    // Pesquisar vídeos
    videos.forEach(video => {
      const titleMatch = video.title.toLowerCase().includes(searchLower);
      const descriptionMatch = video.description?.toLowerCase().includes(searchLower);
      const typeMatch = isVideoSearch; // Busca por tipo "vídeo"
      
      // Busca por badges
      const premiumBadgeMatch = isPremiumSearch && video.isExclusive;
      const freeBadgeMatch = isFreeSearch && !video.isExclusive;
      const exclusiveBadgeMatch = isExclusiveSearch && video.isExclusive;
      
      if (titleMatch || descriptionMatch || typeMatch || premiumBadgeMatch || freeBadgeMatch || exclusiveBadgeMatch) {
        results.push({
          id: video.id,
          title: video.title,
          description: video.description,
          type: 'video',
          url: `/video/${video.id}`,
          imageUrl: video.thumbnailUrl,
          isExclusive: video.isExclusive
        });
      }
    });

    // Pesquisar produtos (apenas ativos)
    products.filter(product => product.isActive).forEach(product => {
      const titleMatch = product.title.toLowerCase().includes(searchLower);
      const descriptionMatch = product.description?.toLowerCase().includes(searchLower);
      const typeMatch = isProductSearch; // Busca por tipo "produto"
      
      // Busca por badges
      const premiumBadgeMatch = isPremiumSearch && product.isExclusive;
      const freeBadgeMatch = isFreeSearch && !product.isExclusive;
      const exclusiveBadgeMatch = isExclusiveSearch && product.isExclusive;
      
      if (titleMatch || descriptionMatch || typeMatch || premiumBadgeMatch || freeBadgeMatch || exclusiveBadgeMatch) {
        results.push({
          id: product.id,
          title: product.title,
          description: product.description,
          type: 'product',
          url: `/produtos#${product.id}`,
          imageUrl: product.coverImageUrl,
          isExclusive: product.isExclusive
        });
      }
    });

    // Pesquisar cupons (apenas ativos)
    coupons.filter(coupon => coupon.isActive).forEach(coupon => {
      const brandMatch = coupon.brand.toLowerCase().includes(searchLower);
      const descriptionMatch = coupon.description.toLowerCase().includes(searchLower);
      const codeMatch = coupon.code.toLowerCase().includes(searchLower);
      const typeMatch = isCouponSearch; // Busca por tipo "cupom"
      
      // Busca por badges
      const premiumBadgeMatch = isPremiumSearch && coupon.isExclusive;
      const freeBadgeMatch = isFreeSearch && !coupon.isExclusive;
      const exclusiveBadgeMatch = isExclusiveSearch && coupon.isExclusive;
      
      if (brandMatch || descriptionMatch || codeMatch || typeMatch || premiumBadgeMatch || freeBadgeMatch || exclusiveBadgeMatch) {
        results.push({
          id: coupon.id,
          title: coupon.brand,
          description: coupon.description,
          type: 'coupon',
          url: `/cupons#${coupon.id}`,
          imageUrl: coupon.coverImageUrl,
          brand: coupon.brand,
          code: coupon.code,
          isExclusive: coupon.isExclusive
        });
      }
    });

    // Ordenar por relevância (título exato primeiro, depois descrição)
    results.sort((a, b) => {
      const aExactTitle = a.title.toLowerCase() === searchLower;
      const bExactTitle = b.title.toLowerCase() === searchLower;
      
      if (aExactTitle && !bExactTitle) return -1;
      if (!aExactTitle && bExactTitle) return 1;
      
      const aTitleMatch = a.title.toLowerCase().includes(searchLower);
      const bTitleMatch = b.title.toLowerCase().includes(searchLower);
      
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      
      return 0;
    });

    // Limitar a 10 resultados
    setSearchResults(results.slice(0, 10));
    setIsSearching(false);
  }, [searchTerm, videos, products, coupons]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-blue-500" />;
      case 'product': return <Package className="w-4 h-4 text-green-500" />;
      case 'coupon': return <Tag className="w-4 h-4 text-orange-500" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Vídeo';
      case 'product': return 'Produto';
      case 'coupon': return 'Cupom';
      default: return '';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setLocation(result.url);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-border shadow-lg">
      <div className="p-4">
        {/* Campo de pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Pesquisar por nome, tipo ou status (vídeo, produto, cupom, premium, free)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10 h-12 text-base"
          />
        </div>

        {/* Resultados */}
        {searchTerm.trim() && (
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {isSearching ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-12 h-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : searchResults.length > 0 ? (
              searchResults.map((result) => (
                <Card
                  key={`${result.type}-${result.id}`}
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-center gap-3">
                    {/* Imagem ou ícone */}
                    <div className="w-12 h-12 flex-shrink-0 bg-muted rounded overflow-hidden flex items-center justify-center">
                      {result.imageUrl ? (
                        <img
                          src={result.imageUrl}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${result.imageUrl ? 'hidden' : 'flex'}`}>
                        {getTypeIcon(result.type)}
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {result.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(result.type)}
                        </Badge>
                        {result.isExclusive && (
                          <Badge variant="default" className="text-xs bg-yellow-500 text-black">
                            Premium
                          </Badge>
                        )}
                      </div>
                      {result.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {result.description}
                        </p>
                      )}
                      {result.type === 'coupon' && result.code && (
                        <p className="text-xs text-primary font-mono">
                          Código: {result.code}
                        </p>
                      )}
                    </div>

                    {/* Seta */}
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum resultado encontrado para "{searchTerm}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tente pesquisar por vídeos, produtos, cupons ou status (premium, free, exclusivo)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Dicas iniciais */}
        {!searchTerm.trim() && (
          <div className="mt-4 text-center py-4">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Digite para pesquisar em todo o sistema
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Busque por nome, tipo ou status: "vídeo", "produto", "cupom", "premium", "free", "exclusivo"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
