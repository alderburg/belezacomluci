import Sidebar from "@/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bell, Check, Trash2, Eye, EyeOff } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PopupSystem } from "@/components/popup-system";
import { useNotificationsWebSocket } from "@/hooks/use-notifications-websocket";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

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

export default function NotificationsPage() {
  const isMobile = useIsMobile();


  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [optimisticReads, setOptimisticReads] = useState<Set<string>>(new Set());
  const [loadingReads, setLoadingReads] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
        <PopupSystem trigger="page_specific" targetPage="notifications" />

        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} notificação{unreadCount > 1 ? 'ões' : ''} não lida{unreadCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {filteredNotifications.length}
            </Badge>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={filter} onValueChange={(value: 'all' | 'unread' | 'read') => setFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">Não lidas</SelectItem>
                <SelectItem value="read">Lidas</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <Check className="w-4 h-4 mr-2" />
                Marcar todas como lidas
              </Button>
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
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

                return (
                <Card key={notification.id} className={`${!isRead ? 'border-l-4 border-l-primary bg-muted/30' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
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
                          className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-muted ${notification.notification.imageUrl ? 'hidden' : 'flex'}`}
                          style={{ display: notification.notification.imageUrl ? 'none' : 'flex' }}
                        >
                          {getNotificationIcon(notification.notification.targetAudience)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-semibold ${!isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.notification.title}
                              </h3>
                              <Badge variant="outline" className={`text-xs ${getTypeColor(notification.notification.targetAudience)}`}>
                                {notification.notification.targetAudience === 'premium' ? 'Premium' :
                                 notification.notification.targetAudience === 'free' ? 'Gratuito' : 'Todos'}
                              </Badge>
                              {!isRead && !isLoading && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                              {isLoading && (
                                <div className="w-5 h-5 flex items-center justify-center">
                                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                            <p className={`text-sm whitespace-pre-line ${!isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.notification.description || 'Sem descrição'}
                            </p>
                            {notification.notification.linkUrl && (
                              <a href={notification.notification.linkUrl} target="_blank" rel="noopener noreferrer"
                                 className="text-xs text-primary hover:underline mt-1 block">
                                Ver mais
                              </a>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {isRead ? (
                              <div className="flex items-center justify-center w-8 h-8">
                                <Check className="w-4 h-4 text-green-600" />
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.notificationId)} disabled={isLoading}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(notification.notification.id)}
                              disabled={isLoading}
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mostrar:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">por página</span>
                </div>

              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>

                <div className="text-sm text-muted-foreground px-3">
                  {currentPage}/{totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Confirmação de Exclusão */}
        <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Notificação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover esta notificação da sua lista?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteModalOpen(false);
                setNotificationToDelete(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteNotification}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Removendo...
                  </>
                ) : (
                  'Remover da minha lista'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Toaster />
      </main>
    </div>
  );
}