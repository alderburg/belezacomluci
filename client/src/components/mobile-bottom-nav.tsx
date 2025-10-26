import { Home, Play, Download, Tag, Sparkles, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  {
    id: "home",
    label: "Início",
    href: "/",
    icon: Home
  },
  {
    id: "videos",
    label: "Vídeos",
    href: "/videos",
    icon: Play
  },
  {
    id: "products",
    label: "Produtos",
    href: "/produtos",
    icon: Download
  },
  {
    id: "coupons",
    label: "Cupons",
    href: "/cupons",
    icon: Tag
  },
  {
    id: "cheirosas",
    label: "Minha Cheirosa",
    href: "/cheirosas",
    icon: Sparkles
  },
  {
    id: "community",
    label: "Comunidade",
    href: "/comunidade",
    icon: Users
  }
];

export default function MobileBottomNav() {
  const [location] = useLocation();
  const [lastResourceType, setLastResourceType] = useState<'product' | 'video' | null>(() => {
    // Tentar recuperar do localStorage ao iniciar
    return (localStorage.getItem('mobile-nav-resource-type') as 'product' | 'video' | null) || null;
  });
  const [previousLocation, setPreviousLocation] = useState<string>('');

  // Detectar se está em uma página de vídeo ou playlist
  const isVideoPage = location.startsWith('/video/');
  const isPlaylistPage = location.startsWith('/playlist/');
  
  // Extrair o ID de forma mais robusta, removendo query params e trailing slashes
  const extractResourceId = () => {
    if (isVideoPage) {
      const id = location.split('/video/')[1];
      return id ? id.split('?')[0].split('/')[0] : null;
    }
    if (isPlaylistPage) {
      const id = location.split('/playlist/')[1];
      return id ? id.split('?')[0].split('/')[0] : null;
    }
    return null;
  };
  
  const resourceId = extractResourceId();

  // Determinar tipo baseado na página atual ou navegação
  useEffect(() => {
    console.log('[MobileNav] Location:', location);
    
    // Se está em /videos, marcar como video
    if (location === '/videos' || location.startsWith('/videos/')) {
      console.log('[MobileNav] ✅ Está em /videos, tipo: video');
      setLastResourceType('video');
      localStorage.setItem('mobile-nav-resource-type', 'video');
    } 
    // Se está em /produtos, marcar como product
    else if (location === '/produtos' || location.startsWith('/produtos/')) {
      console.log('[MobileNav] ✅ Está em /produtos, tipo: product');
      setLastResourceType('product');
      localStorage.setItem('mobile-nav-resource-type', 'product');
    }
    // Se está em /video/ ou /playlist/ e veio de uma página específica
    else if (isVideoPage || isPlaylistPage) {
      if (previousLocation.startsWith('/produtos')) {
        console.log('[MobileNav] ✅ Veio de /produtos, tipo: product');
        setLastResourceType('product');
        localStorage.setItem('mobile-nav-resource-type', 'product');
      } else if (previousLocation.startsWith('/videos')) {
        console.log('[MobileNav] ✅ Veio de /videos, tipo: video');
        setLastResourceType('video');
        localStorage.setItem('mobile-nav-resource-type', 'video');
      }
      // Se não veio de nenhum dos dois, manter o último tipo conhecido
    }
    
    setPreviousLocation(location);
  }, [location, isVideoPage, isPlaylistPage]);

  // Buscar informações do recurso para identificar se é produto ou vídeo exclusivo
  const { data: currentResource } = useQuery<any>({
    queryKey: [`/api/resource/${resourceId}`],
    queryFn: async () => {
      if (!resourceId) return null;
      
      console.log('[MobileNav] Buscando recurso:', resourceId, 'tipo presumido:', lastResourceType);
      
      // Busca na ordem baseada no tipo presumido para melhor performance
      if (lastResourceType === 'product') {
        // Tenta buscar como produto primeiro
        let response = await fetch(`/api/produtos/${resourceId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('[MobileNav] Encontrado como produto:', data.title || data.name);
          return { ...data, _type: 'product' };
        }
        
        // Fallback para vídeo
        response = await fetch(`/api/videos/${resourceId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('[MobileNav] Encontrado como vídeo (fallback):', data.title || data.name);
          return { ...data, _type: 'video' };
        }
      } else {
        // Tenta buscar como vídeo primeiro (padrão ou quando lastResourceType === 'video')
        let response = await fetch(`/api/videos/${resourceId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('[MobileNav] Encontrado como vídeo:', data.title || data.name);
          return { ...data, _type: 'video' };
        }
        
        // Fallback para produto
        response = await fetch(`/api/produtos/${resourceId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('[MobileNav] Encontrado como produto (fallback):', data.title || data.name);
          return { ...data, _type: 'product' };
        }
      }
      
      console.log('[MobileNav] Recurso não encontrado nas APIs, mantendo tipo:', lastResourceType);
      // Retorna um objeto com o tipo presumido mesmo se não encontrou
      return lastResourceType ? { _type: lastResourceType } : null;
    },
    enabled: !!resourceId && (isVideoPage || isPlaylistPage),
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Atualizar o último tipo de recurso conhecido quando os dados carregarem
  useEffect(() => {
    if (currentResource?._type) {
      console.log('[MobileNav] Atualizando tipo de recurso:', currentResource._type);
      setLastResourceType(currentResource._type);
    }
  }, [currentResource]);

  // Resetar quando sair de uma página de vídeo/playlist
  useEffect(() => {
    if (!isVideoPage && !isPlaylistPage) {
      setLastResourceType(null);
    }
  }, [isVideoPage, isPlaylistPage]);

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/" || location === "";
    }
    
    // Lógica especial para Vídeos Exclusivos e Produtos Digitais
    if (href === "/videos") {
      // Ativa se estiver em qualquer página de vídeos OU se o tipo for video
      const isInVideosSection = location.startsWith('/videos');
      const resourceType = lastResourceType;
      const isVideoActive = isInVideosSection || 
        ((isVideoPage || isPlaylistPage) && resourceType === 'video');
      
      console.log('[MobileNav] Verificando /videos - location:', location, 'isInVideosSection:', isInVideosSection, 'resourceType:', resourceType, 'isActive:', isVideoActive);
      
      return isVideoActive;
    } else if (href === "/produtos") {
      // Ativa se estiver em qualquer página de produtos OU se o tipo for product
      const isInProductsSection = location.startsWith('/produtos');
      const resourceType = lastResourceType;
      const isProductActive = isInProductsSection || 
        ((isVideoPage || isPlaylistPage) && resourceType === 'product');
      
      console.log('[MobileNav] Verificando /produtos - location:', location, 'isInProductsSection:', isInProductsSection, 'resourceType:', resourceType, 'isActive:', isProductActive);
      
      return isProductActive;
    }
    
    return location.startsWith(href);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center justify-center py-3 px-1 min-w-0 flex-1 transition-colors",
                "hover:bg-gray-50 active:bg-gray-100"
              )}
            >
              <Icon 
                className={cn(
                  "h-6 w-6 transition-colors",
                  active ? "text-primary" : "text-gray-500"
                )} 
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}