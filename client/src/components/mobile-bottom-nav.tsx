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
  const [lastResourceType, setLastResourceType] = useState<'product' | 'video' | null>(null);
  const [previousLocation, setPreviousLocation] = useState<string>('');

  // Detectar se está em uma página de vídeo ou playlist
  const isVideoPage = location.startsWith('/video/');
  const isPlaylistPage = location.startsWith('/playlist/');
  const resourceId = isVideoPage 
    ? location.split('/video/')[1] 
    : isPlaylistPage 
    ? location.split('/playlist/')[1] 
    : null;

  // Determinar tipo inicial baseado na navegação anterior
  useEffect(() => {
    // Se mudou de /produtos para /video ou /playlist, assume que é produto
    // Se mudou de /videos para /video ou /playlist, assume que é vídeo
    if ((isVideoPage || isPlaylistPage) && !lastResourceType) {
      if (previousLocation === '/produtos') {
        setLastResourceType('product');
      } else if (previousLocation === '/videos') {
        setLastResourceType('video');
      }
    }
    setPreviousLocation(location);
  }, [location]);

  // Buscar informações do recurso para identificar se é produto ou vídeo exclusivo
  const { data: currentResource } = useQuery<any>({
    queryKey: [`/api/resource/${resourceId}`],
    queryFn: async () => {
      if (!resourceId) return null;
      
      // Tenta buscar como produto primeiro
      let response = await fetch(`/api/produtos/${resourceId}`);
      if (response.ok) {
        const data = await response.json();
        return { ...data, _type: 'product' };
      }
      
      // Se não encontrou como produto, tenta como vídeo
      response = await fetch(`/api/videos/${resourceId}`);
      if (response.ok) {
        const data = await response.json();
        return { ...data, _type: 'video' };
      }
      
      return null;
    },
    enabled: !!resourceId && (isVideoPage || isPlaylistPage),
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Atualizar o último tipo de recurso conhecido quando os dados carregarem
  useEffect(() => {
    if (currentResource?._type) {
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
    // Quando estiver em uma página de vídeo/playlist, verifica se é produto ou vídeo exclusivo
    if (href === "/videos") {
      // Ativa se estiver na lista de vídeos OU se estiver vendo um vídeo exclusivo
      // Usa o último tipo conhecido para evitar piscar durante o carregamento
      const resourceType = currentResource?._type || lastResourceType;
      return location === "/videos" || 
        ((isVideoPage || isPlaylistPage) && resourceType === 'video');
    } else if (href === "/produtos") {
      // Ativa se estiver na lista de produtos OU se estiver vendo um produto digital
      // Usa o último tipo conhecido para evitar piscar durante o carregamento
      const resourceType = currentResource?._type || lastResourceType;
      return location === "/produtos" || 
        ((isVideoPage || isPlaylistPage) && resourceType === 'product');
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