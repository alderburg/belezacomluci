import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/contexts/sidebar-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Heart, Home, Play, Download, Tag, Users, User,
  Menu, X, Settings, Crown, LogOut, Shield, Eye, Sparkles, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/contexts/admin-context";
import { PopupSystem } from "@/components/popup-system";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { viewMode, setViewMode } = useAdmin();

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location, isMobile]);

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/videos", label: "Vídeos Exclusivos", icon: Play },
    { href: "/produtos", label: "Produtos Digitais", icon: Download },
    { href: "/cupons", label: "Cupons", icon: Tag },
    { href: "/cheirosas", label: "Minhas Cheirosas", icon: Sparkles },
    {
      icon: Users,
      label: "Timeline da Luci",
      href: "/comunidade",
      adminOnly: false
    },
    { href: "/perfil", label: "Perfil", icon: User },
  ];

  // Add admin links for admin users
  if (user?.isAdmin) {
    navItems.push({ href: "/admin", label: "Admin", icon: Crown });
    navItems.push({ href: "/admin/cheirosas", label: "Gerenciar Cheirosas", icon: BarChart3 });
  }

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    // Primeiro, tenta mostrar o popup de saída se houver algum disponível
    setShowExitPopup(true);
  };

  const handleExitPopupClose = () => {
    // Quando o popup de saída é fechado, mostrar o modal de confirmação
    setShowExitPopup(false);
    setTimeout(() => {
      setShowLogoutDialog(true);
    }, 100);
  };

  const handleDirectLogout = () => {
    // Se não há popup de saída, vai direto para o modal
    setShowExitPopup(false);
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logoutMutation.mutate();
    setShowLogoutDialog(false);
  };

  return (
    <>
      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(true)}
              data-testid="button-open-sidebar"
              className="h-8 w-8"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">Beleza com Luci</h1>
            <div className="w-8" /> {/* Spacer */}
          </div>
        </header>
      )}

      {/* Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-[50] bg-black/70 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[40] bg-background border-r border-border transform transition-all duration-300 ease-in-out shadow-2xl relative",
          isMobile
            ? `w-64 ${isOpen ? "translate-x-0" : "-translate-x-full"}`
            : `${isCollapsed ? "w-20" : "w-64"} translate-x-0`
        )}
      >
        {/* Toggle Button - Half inside, half outside */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            data-testid="button-toggle-sidebar"
            className={cn(
              "absolute top-4 z-10 w-5 h-5 p-0 bg-background border border-border shadow-md hover:bg-muted transition-all duration-300 rounded-full",
              isCollapsed
                ? "right-[-10px]"
                : "right-[-10px]"
            )}
          >
            <Menu className="w-2.5 h-2.5" />
          </Button>
        )}

        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={cn(
            "flex items-center border-b border-border p-6",
            isCollapsed && !isMobile ? "justify-center" : "justify-between"
          )}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              {(!isCollapsed || isMobile) && (
                <h1 className={cn(
                  "text-lg font-bold text-foreground transition-all duration-300 ease-in-out",
                  !isMobile ? (isCollapsed ? "opacity-0 transform translate-x-[-10px]" : "opacity-100 transform translate-x-0 delay-150") : "opacity-100"
                )}>
                  Beleza com Luci
                </h1>
              )}
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-sidebar"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Special case for videos: active when on /videos or /video/...
              // Special case for products: active when on /products or /course/...
              let isActive;
              if (item.href === "/videos") {
                isActive = location === item.href || location.startsWith("/video/");
              } else if (item.href === "/products") {
                isActive = location === item.href || location.startsWith("/course/");
              } else {
                isActive = location === item.href;
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "nav-item flex items-center rounded-lg text-sm font-medium transition-colors cursor-pointer relative",
                    isCollapsed && !isMobile
                      ? "justify-center px-3 py-3"
                      : "space-x-3 px-4 py-3",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                  data-testid={`nav-${item.href.slice(1) || 'home'}`}
                  title={isCollapsed && !isMobile ? item.label : undefined}
                >
                  <div className="relative">
                    <Icon className={cn(
                      "w-5 h-5",
                      item.href === "/cheirosas" && "cheirosas-icon"
                    )} />
                  </div>
                  {(!isCollapsed || isMobile) && (
                    <div className={cn(
                      "flex items-center justify-between w-full transition-all duration-300 ease-in-out relative",
                      !isMobile ? (isCollapsed ? "opacity-0 transform translate-x-[-10px]" : "opacity-100 transform translate-x-0 delay-150") : "opacity-100"
                    )}>
                      <span className={cn(
                        item.href === "/cheirosas" && "cheirosas-text"
                      )}>{item.label}</span>
                    </div>
                  )}
                </Link>
              );
            })}

            {/* User Profile - positioned after admin menu */}
            <div className={cn(
              "mt-4 pt-4 border-t border-border",
              isCollapsed && !isMobile ? "px-0" : "px-0"
            )}>
              {isCollapsed && !isMobile ? (
                <div className="flex flex-col items-center space-y-3">
                  <Link href="/perfil" className="p-2 rounded-lg hover:bg-muted transition-colors" title={user?.name || 'Usuário'}>
                    <Avatar className="w-10 h-10">
                      {user?.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-white">
                          {user ? getUserInitials(user.name) : 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="w-full justify-center bg-[#e92066] text-white hover:bg-[#d11a5a] hover:text-white px-2 py-3"
                    data-testid="button-logout"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Link href="/perfil" className="flex items-center space-x-3 mb-4 p-2 rounded-lg hover:bg-muted transition-colors">
                    <Avatar className="w-10 h-10">
                      {user?.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-white">
                          {user ? getUserInitials(user.name) : 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className={cn(
                      "flex-1 min-w-0 transition-all duration-300 ease-in-out",
                      !isMobile ? (isCollapsed ? "opacity-0 transform translate-x-[-10px]" : "opacity-100 transform translate-x-0 delay-150") : "opacity-100"
                    )}>
                      <p className="text-sm font-medium text-foreground truncate" data-testid="sidebar-user-name">
                        {user?.name || 'Usuário'}
                      </p>
                      {user?.isAdmin && (
                        <p className="text-xs text-accent font-medium">Administradora</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {user?.isAdmin && viewMode === 'free' ? 'Plano Free' : 'Plano Premium'}
                      </p>
                    </div>
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="w-full justify-center bg-[#e92066] text-white hover:bg-[#d11a5a] hover:text-white"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span className={cn(
                      "transition-all duration-300 ease-in-out",
                      !isMobile ? (isCollapsed ? "opacity-0 transform translate-x-[-10px]" : "opacity-100 transform translate-x-0 delay-150") : "opacity-100"
                    )}>
                      Sair
                    </span>
                  </Button>
                </>
              )}
            </div>
          </nav>

          {/* Empty footer space */}
          <div className="p-4">
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar o conteúdo exclusivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLogout}
              disabled={logoutMutation.isPending}
              className="bg-[#e92066] hover:bg-[#d11a5a]"
            >
              {logoutMutation.isPending ? "Saindo..." : "Sair"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Popup */}
      {showExitPopup && (
        <PopupSystem 
          trigger="logout" 
          onClose={handleExitPopupClose}
        />
      )}
    </>
  );
}