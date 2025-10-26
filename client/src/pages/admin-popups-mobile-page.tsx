import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Plus, MessageSquare, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataSync } from '@/hooks/use-data-sync';
import { Popup } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from '@/lib/queryClient';
import { useState } from "react";

export default function AdminPopupsMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useDataSync();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [popupToDelete, setPopupToDelete] = useState<{ id: string; title: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: popups, isLoading } = useQuery<Popup[]>({
    queryKey: ["/api/admin/popups"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/popups/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/popups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/popups"] });
      toast({
        title: "Sucesso",
        description: "Pop-up excluído com sucesso!",
      });
      setDeleteDialogOpen(false);
      setPopupToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir pop-up",
        variant: "destructive",
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin');
  };

  const handleAddClick = () => {
    setLocation('/admin/popups-mobile/new');
  };

  const handleEditClick = (popupId: string) => {
    setEditingId(popupId);
    setLocation(`/admin/popups-mobile/edit/${popupId}`);
  };

  const handleDeleteClick = (popup: Popup) => {
    setPopupToDelete({ id: popup.id, title: popup.title });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (popupToDelete) {
      deleteMutation.mutate(popupToDelete.id);
    }
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      'login': 'Login',
      'page_visit': 'Visita',
      'time_based': 'Tempo',
      'scheduled': 'Agendado'
    };
    return labels[trigger] || trigger;
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
            <h1 className="text-lg font-semibold text-foreground">Pop-ups</h1>
            <p className="text-sm text-muted-foreground">
              {popups?.length || 0} pop-ups cadastrados
            </p>
          </div>
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-24 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : popups && popups.length > 0 ? (
          <div className="space-y-3">
            {popups.map((popup) => (
              <div
                key={popup.id}
                className="bg-card rounded-xl border border-border overflow-hidden"
                data-testid={`card-popup-${popup.id}`}
              >
                {popup.imageUrl && (
                  <img
                    src={popup.imageUrl}
                    alt={popup.title}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-medium text-foreground truncate">
                    {popup.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {popup.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                      {getTriggerLabel(popup.trigger)}
                    </Badge>
                    {popup.isExclusive && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">
                        Premium
                      </Badge>
                    )}
                    <Badge className={`text-xs ${popup.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {popup.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditClick(popup.id)}
                      disabled={editingId === popup.id}
                      data-testid={`button-edit-${popup.id}`}
                    >
                      {editingId === popup.id ? "Carregando..." : "Editar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDeleteClick(popup)}
                      data-testid={`button-delete-${popup.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum pop-up cadastrado</p>
          </div>
        )}
      </div>

      <Button
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={handleAddClick}
        data-testid="button-add-popup"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pop-up "{popupToDelete?.title}"? Esta ação não pode ser desfeita.
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