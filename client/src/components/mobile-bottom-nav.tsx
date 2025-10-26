import { Home, Play, Download, Tag, Sparkles, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
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

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/" || location === "";
    }
    
    // Lógica especial para Vídeos Exclusivos e Produtos Digitais
    // A diferenciação será feita pelas páginas individuais através do botão "Voltar"
    if (href === "/videos") {
      return location === "/videos";
    } else if (href === "/produtos") {
      return location === "/produtos";
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