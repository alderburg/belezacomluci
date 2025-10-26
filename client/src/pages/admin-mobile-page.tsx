import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { 
  Settings,
  ArrowLeft,
  ChevronRight,
  Video,
  ShoppingBag,
  Ticket,
  Image as ImageIcon,
  MessageSquare,
  Bell,
  FolderTree,
  Users
} from "lucide-react";

interface AdminMenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: string;
}

export default function AdminMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect non-admin users
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const adminMenuItems: AdminMenuItem[] = [
    {
      id: "videos",
      title: "Vídeos",
      subtitle: "Gerenciar vídeos e playlists",
      icon: Video,
      path: "/admin/videos"
    },
    {
      id: "products",
      title: "Produtos Digitais",
      subtitle: "Gerenciar e-books, cursos e PDFs",
      icon: ShoppingBag,
      path: "/admin/products"
    },
    {
      id: "coupons",
      title: "Cupons",
      subtitle: "Gerenciar cupons de desconto",
      icon: Ticket,
      path: "/admin/coupons"
    },
    {
      id: "banners",
      title: "Banners",
      subtitle: "Gerenciar banners do carrossel",
      icon: ImageIcon,
      path: "/admin/banners"
    },
    {
      id: "popups",
      title: "Pop-ups",
      subtitle: "Gerenciar pop-ups e avisos",
      icon: MessageSquare,
      path: "/admin/popups"
    },
    {
      id: "notifications",
      title: "Notificações",
      subtitle: "Gerenciar notificações do sistema",
      icon: Bell,
      path: "/admin/notifications"
    },
    {
      id: "categories",
      title: "Categorias",
      subtitle: "Gerenciar categorias de conteúdo",
      icon: FolderTree,
      path: "/admin/categories"
    },
    {
      id: "users",
      title: "Usuários",
      subtitle: "Gerenciar usuários do sistema",
      icon: Users,
      path: "/admin/users"
    }
  ];

  const handleMenuItemClick = (path: string) => {
    setLocation(path);
  };

  const handleBackClick = () => {
    setLocation('/mobile-menu');
  };

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
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Centro do Admin</h1>
            <p className="text-sm text-muted-foreground">Painel administrativo do sistema</p>
          </div>
          <Settings className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* User Profile Section */}
      {user && (
        <div className="bg-pink-100/50 border border-pink-200/50 mx-4 mt-24 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-white shadow-md">
                <AvatarImage 
                  src={user.avatar} 
                  alt={user.name} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              {/* Bolinha indicando admin */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 border-2 border-white rounded-full shadow-sm flex items-center justify-center">
                <Settings className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                {user.name}
              </h2>
              <p className="text-sm text-muted-foreground mb-2">
                Administrador
              </p>
              <Badge 
                variant="default"
                className="text-xs px-2 py-1 bg-amber-500 text-white hover:bg-amber-600"
              >
                Modo Admin
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div className="px-4 pt-6 pb-2">
        <h3 className="text-lg font-semibold text-foreground">Gerenciamento</h3>
        <p className="text-sm text-muted-foreground">Gerencie todo o conteúdo do sistema</p>
      </div>

      {/* Menu Items */}
      <div className="px-4 py-2">
        <div className="space-y-3">
          {adminMenuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item.path)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors"
                data-testid={`button-admin-${item.id}`}
              >
                <div className="flex items-center justify-center w-12 h-12 bg-pink-100/50 border border-pink-200/50 rounded-lg shadow-sm">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-base font-medium text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
