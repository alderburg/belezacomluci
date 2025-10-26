import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Plus, Image as ImageIcon, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataSync } from '@/hooks/use-data-sync';
import { Banner } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from '@/lib/queryClient';
import { useState } from "react";

export default function AdminBannersMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useDataSync();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<{ id: string; title: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: banners, isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/admin/banners"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/banners/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      toast({
        title: "Sucesso",
        description: "Banner excluído com sucesso!",
      });
      setDeleteDialogOpen(false);
      setBannerToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir banner",
        variant: "destructive",
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin');
  };

  const handleAddClick = () => {
    setLocation('/admin/banners-mobile/new');
  };

  const handleEditClick = async (bannerId: string) => {
    setEditingId(bannerId);
    try {
      const response = await fetch(`/api/admin/banners/${bannerId}`);
      if (!response.ok) throw new Error('Erro ao carregar banner');
      const bannerData = await response.json();
      
      window.history.replaceState({ bannerData }, '');
      setLocation(`/admin/banners-mobile/edit/${bannerId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados do banner",
      });
    } finally {
      setEditingId(null);
    }
  };

  const handleDeleteClick = (banner: Banner) => {
    setBannerToDelete({ id: banner.id, title: banner.title });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (bannerToDelete) {
      deleteMutation.mutate(bannerToDelete.id);
    }
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
            <h1 className="text-lg font-semibold text-foreground">Banners</h1>
            <p className="text-sm text-muted-foreground">
              {banners?.length || 0} banners cadastrados
            </p>
          </div>
          <ImageIcon className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-24 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : banners && banners.length > 0 ? (
          <div className="space-y-3">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="bg-card rounded-xl border border-border overflow-hidden"
                data-testid={`card-banner-${banner.id}`}
              >
                {banner.imageUrl && (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-medium text-foreground truncate">
                    {banner.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {banner.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                      {banner.page === 'home' ? 'Página Inicial' : 
                       banner.page === 'videos' ? 'Vídeos Exclusivos' :
                       banner.page === 'products' ? 'Produtos Digitais' :
                       banner.page === 'coupons' ? 'Cupons' :
                       banner.page === 'community' ? 'Comunidade' :
                       banner.page === 'profile' ? 'Perfil' :
                       banner.page === 'video_specific' ? 'Vídeo Específico' :
                       banner.page === 'bio' ? 'Bio' : banner.page}
                    </Badge>
                    {banner.page === 'video_specific' && banner.videoId && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                        ID: {banner.videoId.substring(0, 8)}...
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">Ordem: {banner.order}</Badge>
                    {banner.isExclusive && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">
                        Premium
                      </Badge>
                    )}
                    {(() => {
                      const now = new Date();

                      const parseLocalDate = (dateString: string) => {
                        if (!dateString) return null;

                        if (dateString.includes('T')) {
                          const [datePart, timePart] = dateString.split('T');
                          const [year, month, day] = datePart.split('-').map(Number);
                          const [hour, minute] = timePart.split(':').map(Number);

                          return new Date(year, month - 1, day, hour, minute);
                        }
                        return new Date(dateString);
                      };

                      const startDate = parseLocalDate(banner.startDateTime);
                      const endDate = parseLocalDate(banner.endDateTime);

                      if (startDate || endDate) {
                        if (endDate && now > endDate) {
                          return <Badge className="bg-gray-100 text-gray-700 text-xs">Expirado</Badge>;
                        } else if (startDate && now < startDate) {
                          return <Badge className="bg-orange-100 text-orange-700 text-xs">Programado</Badge>;
                        } else if (banner.isActive && 
                                  (!startDate || now >= startDate) && 
                                  (!endDate || now <= endDate)) {
                          return <Badge className="bg-blue-100 text-blue-700 text-xs">Em Vinculação</Badge>;
                        }
                      }

                      return banner.isActive ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditClick(banner.id)}
                      disabled={editingId === banner.id}
                      data-testid={`button-edit-${banner.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {editingId === banner.id ? "Carregando..." : "Editar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDeleteClick(banner)}
                      data-testid={`button-delete-${banner.id}`}
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
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum banner cadastrado</p>
          </div>
        )}
      </div>

      <Button
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={handleAddClick}
        data-testid="button-add-banner"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o banner "{bannerToDelete?.title}"? Esta ação não pode ser desfeita.
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