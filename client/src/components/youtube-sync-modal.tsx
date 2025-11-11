
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Youtube, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  publishedAt: string;
}

interface Category {
  id: string;
  title: string;
}

export function YouTubeSyncModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [syncedVideos, setSyncedVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [hasAttemptedSync, setHasAttemptedSync] = useState(false);

  const [batchConfig, setBatchConfig] = useState({
    type: "video",
    categoryId: "",
    isExclusive: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Buscar o Channel ID das configurações de API
  const { data: channelData, isLoading: isLoadingChannelId } = useQuery<{ channelId: string | null }>({
    queryKey: ["/api/youtube-channel-id"],
    enabled: isOpen && !!user,
  });

  // Sincronização automática quando o modal abre
  useEffect(() => {
    // Resetar estado quando modal fecha
    if (!isOpen) {
      setHasAttemptedSync(false);
      return;
    }

    // Verificações de segurança
    if (!user || isAuthLoading || !channelData?.channelId || hasAttemptedSync) {
      return;
    }

    // Marcar que já tentamos sincronizar nesta sessão
    setHasAttemptedSync(true);

    // Delay para garantir que tudo está pronto
    const timer = setTimeout(() => {
      handleSync(channelData.channelId);
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, user, isAuthLoading, channelData?.channelId]);

  const handleSync = async (channelIdParam: string) => {
    if (!channelIdParam?.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Channel ID não configurado. Configure em Configurações > APIs",
      });
      return;
    }

    setIsSyncing(true);
    setSyncComplete(false);
    setSyncedVideos([]); // Garantir array vazio

    try {
      console.log('🔄 Iniciando sincronização com canal:', channelIdParam);
      
      const res = await apiRequest("POST", "/api/youtube/sync", { channelId: channelIdParam.trim() });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erro ao sincronizar' }));
        throw new Error(errorData.message || `Erro HTTP ${res.status}`);
      }
      
      const response = await res.json() as {
        totalChannelVideos: number;
        existingVideos: number;
        newVideos: number;
        videos: YouTubeVideo[];
      };

      console.log('✅ Resposta da sincronização:', response);

      // Garantir que videos é sempre um array
      const videos = Array.isArray(response.videos) ? response.videos : [];
      
      setSyncedVideos(videos);
      setSyncComplete(true);

      if (videos.length === 0) {
        toast({
          title: "Sincronização completa",
          description: "Todos os vídeos do canal já estão cadastrados!",
        });
      } else {
        toast({
          title: "Sincronização completa",
          description: `Encontrados ${videos.length} novos vídeos disponíveis para importação`,
        });
      }
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      setSyncedVideos([]); // Garantir array vazio em caso de erro
      setSyncComplete(true); // Marcar como completo mesmo com erro
      
      toast({
        variant: "destructive",
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Erro ao sincronizar com YouTube",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!syncedVideos || syncedVideos.length === 0) {
        throw new Error("Nenhum vídeo para importar");
      }
      
      const videosToImport = syncedVideos
        .filter(video => selectedVideos.has(video.id))
        .map(video => ({
          title: video.title,
          description: video.description,
          videoUrl: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          type: batchConfig.type,
          categoryId: batchConfig.categoryId || null,
          isExclusive: batchConfig.isExclusive,
        }));

      const res = await apiRequest("POST", "/api/videos/import-batch", { videos: videosToImport });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erro ao importar vídeos' }));
        throw new Error(errorData.message || `Erro HTTP ${res.status}`);
      }
      
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Sucesso!",
        description: data.message || "Vídeos importados com sucesso",
      });
      onClose();
      resetState();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao importar vídeos",
      });
    },
  });

  const toggleVideo = (videoId: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
  };

  const toggleAll = () => {
    if (!syncedVideos || syncedVideos.length === 0) return;
    
    if (selectedVideos.size === syncedVideos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(syncedVideos.map(v => v.id)));
    }
  };

  const resetState = () => {
    setSyncedVideos([]);
    setSelectedVideos(new Set());
    setSyncComplete(false);
    setIsSyncing(false);
    setHasAttemptedSync(false);
    setBatchConfig({
      type: "video",
      categoryId: "",
      isExclusive: false,
    });
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  // Estados de loading
  const isLoading = isAuthLoading || isLoadingChannelId || (isSyncing && !syncComplete);
  const hasVideos = syncedVideos && syncedVideos.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-primary" />
            Sincronizar com YouTube
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? "Aguarde enquanto buscamos os vídeos..."
              : syncComplete
              ? `${syncedVideos.length} vídeos disponíveis para importação`
              : "Sincronizando com o canal configurado"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">
              {isAuthLoading 
                ? "Verificando autenticação..." 
                : isLoadingChannelId 
                ? "Carregando configurações..." 
                : "Sincronizando com YouTube..."}
            </p>
            <p className="text-sm text-muted-foreground">
              {isAuthLoading 
                ? "Aguarde..." 
                : isLoadingChannelId 
                ? "Buscando Channel ID..." 
                : "Buscando vídeos não cadastrados..."}
            </p>
          </div>
        ) : syncComplete ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 py-4">
            {hasVideos ? (
              <>
                <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <Label>Tipo de Conteúdo</Label>
                    <Select value={batchConfig.type} onValueChange={(value) => setBatchConfig({ ...batchConfig, type: value })}>
                      <SelectTrigger data-testid="select-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="playlist">Playlist</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria (Opcional)</Label>
                    <Select value={batchConfig.categoryId} onValueChange={(value) => setBatchConfig({ ...batchConfig, categoryId: value })}>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isExclusive"
                      checked={batchConfig.isExclusive}
                      onCheckedChange={(checked) => setBatchConfig({ ...batchConfig, isExclusive: checked as boolean })}
                      data-testid="checkbox-exclusive"
                    />
                    <Label htmlFor="isExclusive" className="cursor-pointer">
                      Conteúdo exclusivo (somente para assinantes)
                    </Label>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">
                      {selectedVideos.size} de {syncedVideos.length} vídeos selecionados
                    </span>
                    <Button variant="outline" size="sm" onClick={toggleAll} data-testid="button-toggle-all">
                      {selectedVideos.size === syncedVideos.length ? "Desmarcar todos" : "Selecionar todos"}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-2">
                    {syncedVideos.map((video) => (
                      <div
                        key={video.id}
                        className={`flex gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedVideos.has(video.id) ? "bg-primary/10 border-primary" : "bg-card hover:bg-muted/50"
                        }`}
                        onClick={() => toggleVideo(video.id)}
                        data-testid={`video-item-${video.id}`}
                      >
                        <Checkbox
                          checked={selectedVideos.has(video.id)}
                          onCheckedChange={() => toggleVideo(video.id)}
                        />
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-32 h-20 rounded-md object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {video.description || "Sem descrição"}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {video.duration}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {new Date(video.publishedAt).toLocaleDateString("pt-BR")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                <p className="text-lg font-medium">Tudo sincronizado!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Todos os vídeos do canal já estão cadastrados no sistema
                </p>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="flex flex-row items-center justify-end gap-2">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
            Cancelar
          </Button>
          {syncComplete && hasVideos && (
            <Button
              onClick={() => importMutation.mutate()}
              disabled={selectedVideos.size === 0 || importMutation.isPending}
              data-testid="button-import"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${selectedVideos.size} vídeo${selectedVideos.size !== 1 ? "s" : ""}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
