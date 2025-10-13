import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/contexts/admin-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { 
  User, 
  Shield, 
  Bell, 
  HelpCircle, 
  Users, 
  Settings,
  ArrowLeft,
  ChevronRight,
  Edit3
} from "lucide-react";

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  path: string;
  adminOnly?: boolean;
}

export default function MobileMenuPage() {
  const { user, logout } = useAuth();
  const { viewMode } = useAdmin();
  const [, setLocation] = useLocation();

  const menuItems: MenuItem[] = [
    {
      id: "account",
      title: "Dados da Conta",
      subtitle: "Gerencie suas informações pessoais",
      icon: User,
      path: "/perfil"
    },
    {
      id: "admin",
      title: "Centro do Admin",
      subtitle: "Painel administrativo do sistema",
      icon: Settings,
      path: "/admin",
      adminOnly: true
    },
    {
      id: "cheirosas",
      title: "Gerenciar Cheirosas",
      subtitle: "Sistema de desafios e recompensas",
      icon: Users,
      path: "/admin/cheirosas",
      adminOnly: true
    },
    {
      id: "notifications",
      title: "Notificações",
      subtitle: "Configurar alertas e avisos",
      icon: Bell,
      path: "/configuracoes-notificacoes"
    },
    {
      id: "security",
      title: "Segurança",
      subtitle: "Privacidade e proteção da conta",
      icon: Shield,
      path: "/seguranca"
    },
    {
      id: "support",
      title: "Ajuda e Suporte",
      subtitle: "Central de ajuda e atendimento",
      icon: HelpCircle,
      path: "/ajuda"
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.adminOnly || user?.isAdmin
  );

  const handleMenuItemClick = (path: string) => {
    setLocation(path);
  };

  const handleBackClick = () => {
    setLocation('/');
  };

  const handleEditProfile = () => {
    setLocation('/meuperfil');
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
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Configurações</h1>
            <p className="text-sm text-muted-foreground">Gerencie sua conta e preferências</p>
          </div>
          <Settings className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* User Profile Section */}
      {user && (
        <div className="bg-pink-100/50 border border-pink-200/50 mx-4 mt-20 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-white shadow-md">
                <AvatarImage 
                  src={user.avatar} 
                  alt={user.name} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {/* Bolinha verde indicando online */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                {user.name}
              </h2>
              <p className="text-sm text-muted-foreground mb-2">
                {user.email}
              </p>
              <Badge 
                variant={((user?.isAdmin ? viewMode : user.planType) || 'free') === 'premium' ? 'default' : 'secondary'} 
                className={`text-xs px-2 py-1 ${
                  ((user?.isAdmin ? viewMode : user.planType) || 'free') === 'premium' 
                    ? 'bg-accent text-accent-foreground hover:bg-accent/80' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/80'
                }`}
              >
                {((user?.isAdmin ? viewMode : user.planType) || 'free') === 'premium' ? 'Acesso Premium' : 'Acesso Free'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-white/50 hover:text-foreground"
              onClick={handleEditProfile}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Título Configurações */}
      <div className="px-4 pt-6 pb-2">
        <h3 className="text-lg font-semibold text-foreground">Configurações</h3>
        <p className="text-sm text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>

      {/* Menu Items */}
      <div className="px-4 py-2">
        <div className="space-y-3">
          {filteredMenuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item.path)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors"
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