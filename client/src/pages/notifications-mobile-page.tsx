import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, Trash2, Eye, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNotificationsWebSocket } from "@/hooks/use-notifications-websocket";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useLocation } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import MobileTopBar from "@/components/mobile-top-bar";

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

export default function NotificationsMobilePage() {
  const { toast } = useToast();
  
  
  const [location, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [optimisticReads, setOptimisticReads] = useState<Set<string>>(new Set());
  const [loadingReads, setLoadingReads] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Scroll para o topo quando a página carrega
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Conectar ao WebSocket para notificações em tempo real
  const { isConnected, markNotificationAsRead, markAllNotificationsAsRead } = useNotificationsWebSocket();

  const { data: notifications, isLoading, refetch } = useQuery<UserNotification[]>({
    queryKey: ["/api/user-notifications"],
    queryFn: async () => {
      const response = await fetch('/api/user-notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
    refetchInterval: isConnected ? false : 30000 // Usar polling apenas se WebSocket não conectado
  });

  const filteredNotifications = notifications?.filter(notification => {
    if (filter === 'read') return notification.isRead;
    if (filter === 'unread') return !notification.isRead;
    return true;
  }) || [];

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  const getNotificationIcon = (targetAudience: string) => {
    switch (targetAudience) {
      case 'premium': return '💎';
      case 'free': return '📢';
      case 'all': return '🔔';
      default: return '📢';
    }
  };

  const getTypeColor = (targetAudience: string) => {
    switch (targetAudience) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'free': return 'bg-blue-100 text-blue-800';
      case 'all': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const markAsRead = (notificationId: string) => {
    // Verificar se a notificação já está em estado de loading ou já foi marcada como lida
    if (loadingReads.has(notificationId) || optimisticReads.has(notificationId)) {
      return;
    }

    // Adicionar ao estado de loading para indicar que a operação está em andamento
    setLoadingReads(prev => new Set([...prev, notificationId]));

    // Usar WebSocket se conectado, caso contrário fallback para REST
    if (isConnected) {
      const success = markNotificationAsRead(notificationId);
      if (!success) {
        // Se falhou ao enviar via WebSocket, remove do loading
        setLoadingReads(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
        console.log('Failed to send via WebSocket, notification remains unread');
      } else {
        // Se sucesso via WebSocket, adicionar ao estado otimista e remover do loading após delay
        setOptimisticReads(prev => new Set([...prev, notificationId]));
        setTimeout(() => {
          setLoadingReads(prev => {
            const newSet = new Set(prev);
            newSet.delete(notificationId);
            return newSet;
          });
        }, 800); // Pequeno delay para mostrar o preloader
      }
    } else {
      // Fallback para REST API se WebSocket não estiver conectado
      fetch(`/api/user-notifications/${notificationId}/read`, {
        method: 'POST'
      }).then(response => {
        if (response.ok) {
          // Adicionar ao estado otimista
          setOptimisticReads(prev => new Set([...prev, notificationId]));
          // Aguardar um pouco antes de remover do loading e refazer a consulta
          setTimeout(() => {
            setLoadingReads(prev => {
              const newSet = new Set(prev);
              newSet.delete(notificationId);
              return newSet;
            });
            refetch();
          }, 800);
        } else {
          setLoadingReads(prev => {
            const newSet = new Set(prev);
            newSet.delete(notificationId);
            return newSet;
          });
        }
      }).catch(error => {
        console.error('Error marking notification as read:', error);
        setLoadingReads(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
      });
    }
  };

  const markAllAsRead = () => {
    if (isConnected) {
      const success = markAllNotificationsAsRead();
      if (!success) {
        console.log('Failed to send via WebSocket, trying REST API fallback');
        // Fallback para REST API
        fetch('/api/user-notifications/read-all', {
          method: 'POST'
        }).then(response => {
          if (response.ok) {
            refetch();
          }
        }).catch(error => {
          console.error('Error marking all notifications as read:', error);
        });
      }
    } else {
      // Usar REST API se WebSocket não conectado
      fetch('/api/user-notifications/read-all', {
        method: 'POST'
      }).then(response => {
        if (response.ok) {
          refetch();
        }
      }).catch(error => {
        console.error('Error marking all notifications as read:', error);
      });
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

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleDeleteNotification = async () => {
    if (!notificationToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/user-notifications/${notificationToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Fecha o modal imediatamente
        setDeleteModalOpen(false);
        setNotificationToDelete(null);

        // Mostra o toast de sucesso
        toast({
          title: "Notificação removida",
          description: "A notificação foi removida da sua lista com sucesso.",
        });

        // Atualiza a lista
        await refetch();
      } else {
        const errorText = await response.text();
        console.error('Erro ao remover notificação:', response.status, errorText);

        toast({
          title: "Erro ao remover",
          description: "Não foi possível remover a notificação. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao remover notificação:', error);

      toast({
        title: "Erro de conexão",
        description: "Verifique sua conexão com a internet e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (notificationId: string) => {
    setNotificationToDelete(notificationId);
    setDeleteModalOpen(true);
  };

  // Limpar estado otimista e loading quando dados são atualizados via WebSocket
  useEffect(() => {
    if (notifications) {
      // Remover da lista otimista as notificações que já estão marcadas como lidas no backend
      setOptimisticReads(prev => {
        const newSet = new Set(prev);
        notifications.forEach(notification => {
          if (notification.isRead && newSet.has(notification.notificationId)) {
            newSet.delete(notification.notificationId);
          }
        });
        return newSet;
      });

      // Limpar loading state para notificações que foram confirmadas
      setLoadingReads(prev => {
        const newSet = new Set(prev);
        notifications.forEach(notification => {
          if (notification.isRead && newSet.has(notification.notificationId)) {
            newSet.delete(notification.notificationId);
          }
        });
        return newSet;
      });
    }
  }, [notifications]);

  const handleBackClick = () => {
    setLocation('/');
  };

  const handleMenuClick = () => {
    setLocation('/mobile-menu');
  };

  const handleUserClick = () => {
    setLocation('/meu-perfil');
  };

  const handleNotificationClick = (notification: UserNotification) => {
    const notificationId = notification.notificationId;

    // Marcar como lida se não estiver lida
    if (!notification.isRead && !loadingReads.has(notificationId) && !optimisticReads.has(notificationId)) {
      markAsRead(notificationId);
    }

    // Verificar se tem link para redirecionamento
    if (notification.notification?.linkUrl) {
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
            console.error('Erro ao processar URL:', e);
            internalPath = linkUrl;
          }
        }
        
        // Pequeno delay para garantir que a marcação como lida seja processada
        setTimeout(() => {
          setLocation(internalPath);
        }, 100);
      } else {
        // Link externo - abrir em nova aba
        window.open(linkUrl, '_blank', 'noopener,noreferrer');
      }
    }
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
            <h1 className="text-lg font-semibold text-foreground">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
                : 'Todas as notificações'
              }
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-2 py-1">
            {filteredNotifications.length}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pt-24 pb-4">

        {/* Filtros */}
        <div className="flex gap-3 mb-6">
          <Select value={filter} onValueChange={(value: 'all' | 'unread' | 'read') => setFilter(value)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">Não lidas</SelectItem>
              <SelectItem value="read">Lidas</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={markAllAsRead} className="flex-shrink-0">
            <Check className="w-4 h-4 mr-2" />
            Marcar todas como lidas
          </Button>
        </div>

        {/* Lista de Notificações */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: itemsPerPage }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : currentNotifications.length > 0 ? (
            currentNotifications.map((notification) => {
              // Verifica se foi marcada como lida otimisticamente
              const isOptimisticallyRead = optimisticReads.has(notification.notificationId);
              // Verifica se está em estado de loading
              const isLoading = loadingReads.has(notification.notificationId);
              // Prioriza o estado do banco, mas permite otimização para melhor UX
              const isRead = notification.isRead || isOptimisticallyRead;
              
              // Verificar se a notificação tem os dados necessários
              if (!notification.notification) {
                console.error('Notificação sem dados:', notification);
                return null;
              }

              return (
                <Card
                  key={notification.id}
                  className={`${!isRead ? 'border-l-4 border-l-primary bg-muted/30' : ''} ${!isLoading ? 'cursor-pointer hover:bg-muted/50 active:bg-muted/60' : 'cursor-not-allowed'} transition-all duration-200`}
                  onClick={() => !isLoading && handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {notification.notification?.imageUrl ? (
                          <img
                            src={notification.notification.imageUrl}
                            alt={notification.notification.title || 'Notificação'}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              // Se a imagem falhar ao carregar, mostra o ícone
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-muted ${notification.notification?.imageUrl ? 'hidden' : 'flex'}`}
                          style={{ display: notification.notification?.imageUrl ? 'none' : 'flex' }}
                        >
                          {getNotificationIcon(notification.notification?.targetAudience || 'all')}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className={`font-semibold text-sm ${!isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.notification?.title || 'Notificação'}
                              </h3>
                              <Badge variant="outline" className={`text-xs ${getTypeColor(notification.notification?.targetAudience || 'all')}`}>
                                {notification.notification?.targetAudience === 'premium' ? 'Premium' :
                                 notification.notification?.targetAudience === 'free' ? 'Gratuito' : 'Todos'}
                              </Badge>
                              {!isRead && !isLoading && (
                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                              )}
                              {isLoading && (
                                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                            <p className={`text-sm whitespace-pre-line ${!isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.notification?.description || 'Sem descrição'}
                            </p>
                            {notification.notification?.linkUrl && (
                              <p className="text-xs text-primary mt-1">
                                Toque para ver mais
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {isRead ? (
                              <div className="flex items-center justify-center w-8 h-8">
                                <Check className="w-4 h-4 text-green-600" />
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.notificationId);
                                }}
                                disabled={isLoading}
                                className="p-2"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(notification.notification.id);
                              }}
                              disabled={isLoading}
                              className="p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filter === 'unread'
                  ? "Nenhuma notificação não lida"
                  : filter === 'read'
                  ? "Nenhuma notificação lida"
                  : "Nenhuma notificação disponível"
                }
              </p>
            </div>
          )}
        </div>

        {/* Controles de Paginação */}
        {filteredNotifications.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <span className="text-sm text-muted-foreground min-w-[60px] text-center px-1">
                  {currentPage}/{totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav />

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent
          className="mx-auto w-[calc(100vw-32px)] sm:max-w-sm rounded-2xl border-0 shadow-xl p-4"
        >
          <AlertDialogHeader className="text-center space-y-2">
            <AlertDialogTitle>Remover Notificação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a notificação{' '}
              <span className="font-bold">
                "{notifications?.find(n => n.notification.id === notificationToDelete)?.notification.title}"
              </span>{' '}
              da sua lista?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-row items-center justify-center gap-2 mt-4 sm:space-y-0">
            <AlertDialogCancel
              onClick={() => {
                setDeleteModalOpen(false);
                setNotificationToDelete(null);
              }}
              className="flex-1 h-10 rounded-xl flex items-center justify-center border border-input bg-background text-foreground hover:bg-muted mt-0"
            >
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDeleteNotification}
              disabled={isDeleting}
              className="flex-1 h-10 rounded-xl flex items-center justify-center bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed mt-0"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}