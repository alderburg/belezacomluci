import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Plus, Video as VideoIcon, Edit, Trash2, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataSync } from '@/hooks/use-data-sync';
import { Video } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useState } from "react";
import { apiRequest } from '@/lib/queryClient';

export default function AdminVideosMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useDataSync();
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: videos, isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/videos/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videos'] });
      toast({
        title: "Sucesso!",
        description: "Vídeo excluído com sucesso",
      });
      setVideoToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao excluir vídeo",
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin');
  };

  const handleCreateClick = () => {
    setLocation('/admin/videos-mobile/new');
  };

  const handleEdit = async (id: number) => {
    setEditingId(String(id));
    try {
      const response = await fetch(`/api/admin/videos/${id}`);
      if (!response.ok) throw new Error('Erro ao carregar vídeo');
      const videoData = await response.json();
      setLocation(`/admin/videos-mobile/edit/${id}`, { state: { videoData } });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados do vídeo",
      });
    } finally {
      setEditingId(null);
    }
  };

  const handleDeleteClick = (video: Video) => {
    setVideoToDelete(video);
  };

  const confirmDelete = () => {
    if (videoToDelete) {
      deleteMutation.mutate(videoToDelete.id);
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
            <h1 className="text-lg font-semibold text-foreground">Vídeos</h1>
            <p className="text-sm text-muted-foreground">
              {videos?.length || 0} vídeos cadastrados
            </p>
          </div>
          <VideoIcon className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-24 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="space-y-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-card rounded-xl border border-border p-4"
                data-testid={`card-video-${video.id}`}
              >
                <div className="flex gap-3">
                  {video.thumbnailUrl && (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-24 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {video.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {video.description}
                    </p>
                    {video.isExclusive && (
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          Premium
                        </Badge>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      {video.type === 'playlist' ? (
                        <Badge className="bg-orange-100 text-orange-700 text-xs">
                          Playlist
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          Vídeo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(Number(video.id))}
                    disabled={editingId === video.id}
                    data-testid={`button-edit-${video.id}`}
                  >
                    {editingId === video.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Edit className="h-4 w-4 mr-2" />
                    )}
                    {editingId === video.id ? "Carregando..." : "Editar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDeleteClick(video)}
                    data-testid={`button-delete-${video.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <VideoIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum vídeo cadastrado</p>
          </div>
        )}
      </div>

      <Button
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={handleCreateClick}
        data-testid="button-add-video"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AlertDialog open={!!videoToDelete} onOpenChange={() => setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o vídeo "{videoToDelete?.title}"? Esta ação não pode ser desfeita.
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