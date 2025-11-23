import { Bell, Search, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/contexts/admin-context";
import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useNotificationsWebSocket } from "@/hooks/use-notifications-websocket";
import MobileSearch from "@/components/mobile-search";

interface UserNotification {
  id: string;
  userId: string;
  notificationId: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  notification: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    targetAudience: string;
    isActive: boolean;
    startDateTime: string | null;
    endDateTime: string | null;
    createdAt: string;
  };
}

interface MobileTopBarProps {
  title?: string;
  showMenuButton?: boolean;
  showSearchButton?: boolean;
  showNotificationButton?: boolean;
  showUserAvatar?: boolean;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  onNotificationClick?: () => void;
  onUserClick?: () => void;
}

export default function MobileTopBar({
  title = "Beleza com Luci",
  showMenuButton = true,
  showSearchButton = true,
  showNotificationButton = true,
  showUserAvatar = true,
  onMenuClick,
  onSearchClick,
  onNotificationClick,
  onUserClick
}: MobileTopBarProps) {
  const { user } = useAuth();
  const { viewMode } = useAdmin();
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [, setLocation] = useLocation();

  // State to track loading status for marking notifications as read
  const [loadingReads, setLoadingReads] = useState<Set<string>>(new Set());

  // Conectar ao WebSocket para notificações em tempo real
  const { isConnected } = useNotificationsWebSocket();

  const { data: notifications = [], refetch } = useQuery<UserNotification[]>({
    queryKey: ["/api/user-notifications"],
    queryFn: async () => {
      const response = await fetch('/api/user-notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const notificationCount = unreadNotifications.length;
  const recentNotifications = unreadNotifications.slice(0, 3); // Mostrar apenas as 3 mais recentes

  // Efeito para remover loading quando notificação não está mais na lista
  useEffect(() => {
    loadingReads.forEach(notificationId => {
      const stillExists = notifications.some(n => n.notificationId === notificationId && !n.isRead);
      if (!stillExists) {
        // Notificação foi removida ou marcada como lida, remover do loading após um pequeno delay
        setTimeout(() => {
          setLoadingReads(prev => {
            const next = new Set(prev);
            next.delete(notificationId);
            return next;
          });
        }, 500);
      }
    });
  }, [notifications, loadingReads]);

  const getNotificationIcon = (targetAudience: string) => {
    switch (targetAudience) {
      case 'premium': return '💎';
      case 'free': return '📢';
      case 'all': return '🔔';
      default: return '📢';
    }
  };

  const formatDate = (dateString: string) => {
    // Garantir que ambas as datas estejam no mesmo fuso horário (local)
    const date = new Date(dateString);
    const now = new Date();

    // Se a data vem do banco em UTC, converter para local
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);

    const diffInMinutes = Math.floor((now.getTime() - localDate.getTime()) / (1000 * 60));

    if (diffInMinutes <= 0) {
      return 'agora mesmo';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min atrás`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} dia${days > 1 ? 's' : ''} atrás`;
    }
  };

  // Função para marcar notificação como lida e redirecionar se necessário
  const handleNotificationClick = (notification: UserNotification) => {
    const notificationId = notification.notificationId;

    // Adicionar ao set de loading
    setLoadingReads(prev => new Set(prev).add(notificationId));

    // Marcar como lida usando REST API (mobile não usa WebSocket para simplificar)
    fetch(`/api/user-notifications/${notificationId}/read`, {
      method: 'POST'
    }).then(response => {
      if (response.ok) {
        setTimeout(() => {
          refetch().then(() => {
            // Aguardar mais um pouco após o refetch para garantir que a UI foi atualizada
            setTimeout(() => {
              setLoadingReads(prev => {
                const next = new Set(prev);
                next.delete(notificationId);
                return next;
              });
            }, 300);
          });
        }, 800);
      } else {
        setLoadingReads(prev => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
      }
    }).catch(error => {
      console.error('Error marking notification as read:', error);
      setLoadingReads(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    });

    // Verificar se tem link para redirecionamento
    if (notification.notification.linkUrl) {
      const linkUrl = notification.notification.linkUrl;

      // Verificar se é link interno ou externo
      if (linkUrl.startsWith('/') || linkUrl.includes(window.location.hostname)) {
        // Link interno - navegar dentro do sistema
        let internalPath = linkUrl;
        if (linkUrl.startsWith('http')) {
          // Extrair apenas o path do URL completo
          try {
            const url = new URL(linkUrl);
            internalPath = url.pathname + url.search + url.hash;
          } catch (e) {
            internalPath = linkUrl;
          }
        }
        setLocation(internalPath);
      } else {
        // Link externo - abrir em nova aba
        window.open(linkUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick();
    }
    setIsSearchOpen(true);
  };

  return (
    <>
      {/* Overlay para fechar pesquisa */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsSearchOpen(false)}
        />
      )}

      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-accent shadow-lg border-b border-white/10 h-20">
      <div className="flex items-center justify-between px-4 h-full">
        {/* Left Side */}
        <div className="flex items-center gap-3">
          {/* User Avatar, Name and Badge */}
          {showUserAvatar && user && (
            <div className="flex items-center gap-2" onClick={onUserClick}>
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage
                  src={user.avatar}
                  alt={user.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-white text-primary text-base font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <h1 className="text-white font-bold text-base truncate max-w-[130px]">
                  {user.name}
                </h1>
                <Badge
                  variant={((user?.isAdmin ? viewMode : user.planType) || 'free') === 'premium' ? 'default' : 'secondary'}
                  className={`text-xs px-2.5 py-0.5 ${
                    ((user?.isAdmin ? viewMode : user.planType) || 'free') === 'premium'
                      ? 'bg-yellow-500 text-black hover:bg-yellow-600'
                      : 'text-white hover:opacity-90'
                  }`}
                  style={((user?.isAdmin ? viewMode : user.planType) || 'free') !== 'premium' ? { backgroundColor: '#e92066' } : undefined}
                >
                  {((user?.isAdmin ? viewMode : user.planType) || 'free') === 'premium' ? 'Acesso Premium' : 'Acesso Free'}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {showSearchButton && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={handleSearchClick}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          {showNotificationButton && (
            <Popover open={isNotificationPopoverOpen} onOpenChange={setIsNotificationPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`text-white hover:bg-white/10 relative transition-all duration-300 ${
                    notificationCount > 0 
                      ? 'hover:bg-pink-500/20' 
                      : ''
                  }`}
                >
                  {/* Indicador de conexão WebSocket */}
                  {isConnected && (
                    <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}

                  {/* Efeito de ondas quando há notificações */}
                  {notificationCount > 0 && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-pink-400 opacity-40 animate-ping" />
                      <div className="absolute inset-0 rounded-full bg-pink-300 opacity-25 animate-ping animation-delay-75" />
                    </>
                  )}

                  <Bell 
                    className={`h-5 w-5 transition-all duration-300 ${
                      notificationCount > 0 
                        ? 'animate-bounce text-pink-200 drop-shadow-lg' 
                        : 'text-white'
                    }`} 
                  />

                  {notificationCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white shadow-lg border-2 border-white"
                    >
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="center">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Notificações</h4>
                    <Badge variant="secondary">{notificationCount}</Badge>
                  </div>
                  <div className="space-y-3">
                    {recentNotifications.length > 0 ? (
                      recentNotifications.map((notification) => {
                        const isLoading = loadingReads.has(notification.notificationId);

                        return (
                        <div key={notification.id} className={`flex items-start gap-3 p-3 border-l-4 border-l-primary bg-muted/30 rounded-r-lg ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50 active:bg-muted/60'} relative transition-all duration-200`} onClick={() => !isLoading && handleNotificationClick(notification)}>
                          {isLoading && (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-r-lg flex items-center justify-center z-50 border-l-4 border-l-primary">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <span className="text-xs font-medium text-primary text-center">Marcando como lida...</span>
                              </div>
                            </div>
                          )}
                          <div className="flex-shrink-0">
                            {notification.notification.imageUrl ? (
                              <img
                                src={notification.notification.imageUrl}
                                alt={notification.notification.title}
                                className="w-12 h-12 rounded-lg object-cover"
                                onError={(e) => {
                                  // Se a imagem falhar ao carregar, mostra o ícone
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl bg-muted ${notification.notification.imageUrl ? 'hidden' : 'flex'}`}
                              style={{ display: notification.notification.imageUrl ? 'none' : 'flex' }}
                            >
                              {getNotificationIcon(notification.notification.targetAudience)}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-foreground">{notification.notification.title}</h4>
                              {!notification.isRead && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                            </div>
                            <p className="text-xs text-foreground whitespace-pre-line">{notification.notification.description || 'Sem descrição'}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(notification.createdAt)}</p>
                          </div>
                        </div>
                      )})
                    ) : (
                      <div className="text-center py-4">
                        <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma notificação não lida</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => {
                      setLocation('/notificacoes');
                      setIsNotificationPopoverOpen(false);
                    }}
                  >
                    Ver todas as notificações
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Menu Button */}
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      </div>

      {/* Componente de pesquisa mobile */}
      <MobileSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}