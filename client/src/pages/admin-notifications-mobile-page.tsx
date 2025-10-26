import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Plus, Bell, Edit, Trash2, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataSync } from '@/hooks/use-data-sync';
import { Notification } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from '@/lib/queryClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function AdminNotificationsMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useDataSync();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<{ id: string; title: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/admin/notifications"],
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest(`/api/admin/notifications/${notificationId}/send`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Notificação enviada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao enviar notificação",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({
        title: "Sucesso",
        description: "Notificação excluída com sucesso!",
      });
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir notificação",
        variant: "destructive",
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin');
  };

  const handleAddClick = () => {
    setLocation('/admin/notifications-mobile/new');
  };

  const handleEditClick = async (notificationId: string) => {
    setEditingId(notificationId);
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`);
      if (!response.ok) throw new Error('Erro ao carregar notificação');
      const notificationData = await response.json();
      
      window.history.replaceState({ notificationData }, '');
      setLocation(`/admin/notifications-mobile/edit/${notificationId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados da notificação",
      });
    } finally {
      setEditingId(null);
    }
  };

  const handleDeleteClick = (notification: Notification) => {
    setNotificationToDelete({ id: notification.id, title: notification.title });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (notificationToDelete) {
      deleteMutation.mutate(notificationToDelete.id);
    }
  };

  const getTargetAudienceLabel = (audience: string) => {
    const labels: Record<string, string> = {
      'all': 'Todos',
      'free': 'Gratuitos',
      'premium': 'Premium'
    };
    return labels[audience] || audience;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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
            <h1 className="text-lg font-semibold text-foreground">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              {notifications?.length || 0} notificações cadastradas
            </p>
          </div>
          <Bell className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-24 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-card rounded-xl border border-border p-4"
                data-testid={`card-notification-${notification.id}`}
              >
                <div className="flex gap-3">
                  {notification.imageUrl && (
                    <img
                      src={notification.imageUrl}
                      alt={notification.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                        {getTargetAudienceLabel(notification.targetAudience)}
                      </Badge>
                      {notification.isExclusive && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          Premium
                        </Badge>
                      )}
                      <Badge className={`text-xs ${notification.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {notification.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendNotificationMutation.mutate(notification.id)}
                    disabled={sendNotificationMutation.isPending}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                    data-testid={`button-send-${notification.id}`}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditClick(notification.id)}
                    disabled={editingId === notification.id}
                    data-testid={`button-edit-${notification.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {editingId === notification.id ? "Carregando..." : "Editar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDeleteClick(notification)}
                    data-testid={`button-delete-${notification.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma notificação cadastrada</p>
          </div>
        )}
      </div>

      <Button
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={handleAddClick}
        data-testid="button-add-notification"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a notificação "{notificationToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileBottomNav />
    </div>
  );
}