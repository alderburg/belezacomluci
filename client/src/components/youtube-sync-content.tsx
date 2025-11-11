import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Youtube, CheckCircle2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
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

interface VideoConfig {
  categoryId: string;
  isExclusive: boolean;
}

interface YouTubeSyncContentProps {
  mode?: "modal" | "inline";
  onCancel?: () => void;
  onSuccess?: () => void;
  initialSync?: boolean;
}

export function YouTubeSyncContent({ 
  mode = "modal", 
  onCancel, 
  onSuccess,
  initialSync = true
}: YouTubeSyncContentProps) {
  const [syncedVideos, setSyncedVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(initialSync);
  const [syncComplete, setSyncComplete] = useState(false);
  const [hasAttemptedSync, setHasAttemptedSync] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [batchConfig, setBatchConfig] = useState({
    type: "video",
    categoryId: "",
    isExclusive: false,
  });

  const [individualConfigs, setIndividualConfigs] = useState<Map<string, VideoConfig>>(new Map());

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: channelData, isLoading: isLoadingChannelId } = useQuery<{ channelId: string | null }>({
    queryKey: ["/api/youtube-channel-id"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!initialSync || !user || isAuthLoading || !channelData?.channelId || hasAttemptedSync) {
      return;
    }

    setHasAttemptedSync(true);

    const timer = setTimeout(() => {
      handleSync(channelData.channelId);
    }, 100);

    return () => clearTimeout(timer);
  }, [user, isAuthLoading, channelData?.channelId, initialSync]);

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
    setSyncedVideos([]);

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
      setSyncedVideos([]);
      setSyncComplete(true);
      
      toast({
        variant: "destructive",
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Erro ao sincronizar com YouTube",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const applyBatchConfig = () => {
    const newConfigs = new Map(individualConfigs);
    selectedVideos.forEach(videoId => {
      newConfigs.set(videoId, {
        categoryId: batchConfig.categoryId,
        isExclusive: batchConfig.isExclusive,
      });
    });
    setIndividualConfigs(newConfigs);
    toast({
      title: "Configuração aplicada",
      description: `Configurações aplicadas a ${selectedVideos.size} vídeo(s) selecionado(s)`,
    });
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!syncedVideos || syncedVideos.length === 0) {
        throw new Error("Nenhum vídeo para importar");
      }
      
      const videosToImport = syncedVideos
        .filter(video => selectedVideos.has(video.id))
        .map(video => {
          const config = getVideoConfig(video.id);
          return {
            title: video.title,
            description: video.description,
            videoUrl: video.videoUrl,
            thumbnailUrl: video.thumbnailUrl,
            duration: video.duration,
            type: "video",
            categoryId: config.categoryId || null,
            isExclusive: config.isExclusive,
          };
        });

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
      onSuccess?.();
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
    setCurrentPage(1);
    setIndividualConfigs(new Map());
    setBatchConfig({
      type: "video",
      categoryId: "",
      isExclusive: false,
    });
  };

  const getVideoConfig = (videoId: string): VideoConfig => {
    return individualConfigs.get(videoId) || {
      categoryId: batchConfig.categoryId,
      isExclusive: batchConfig.isExclusive,
    };
  };

  const updateIndividualConfig = (videoId: string, config: Partial<VideoConfig>) => {
    const currentConfig = getVideoConfig(videoId);
    const newConfigs = new Map(individualConfigs);
    newConfigs.set(videoId, { ...currentConfig, ...config });
    setIndividualConfigs(newConfigs);
  };

  const handleCancel = () => {
    onCancel?.();
    resetState();
  };

  const isLoading = isAuthLoading || isLoadingChannelId || (isSyncing && !syncComplete);
  const hasVideos = syncedVideos && syncedVideos.length > 0;

  const totalPages = Math.ceil(syncedVideos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentVideos = syncedVideos.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex flex-col space-y-4">
      {/* Header - only for modal mode */}
      {mode === "modal" && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Sincronizar com YouTube</h3>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Aguarde enquanto buscamos os vídeos..."
              : syncComplete
              ? `${syncedVideos.length} vídeos disponíveis para importação`
              : "Sincronizando com o canal configurado"}
          </p>
        </>
      )}

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
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {hasVideos ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedVideos.size} de {syncedVideos.length} vídeos selecionados
                  </span>
                  <Button variant="outline" size="sm" onClick={toggleAll} data-testid="button-toggle-all">
                    {selectedVideos.size === syncedVideos.length ? "Desmarcar todos" : "Selecionar todos"}
                  </Button>
                </div>

                <Card className="p-4">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-medium">Aplicar a todos os selecionados:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div className="space-y-2">
                        <Label htmlFor="batch-category" className="text-xs">Categoria</Label>
                        <Select 
                          value={batchConfig.categoryId} 
                          onValueChange={(value) => setBatchConfig({ ...batchConfig, categoryId: value })}
                        >
                          <SelectTrigger id="batch-category" data-testid="select-batch-category" className="h-9">
                            <SelectValue placeholder="Selecione" />
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

                      <div className="space-y-2">
                        <Label htmlFor="batch-exclusive" className="text-xs">Exclusivo</Label>
                        <div className="flex items-center space-x-2 h-9">
                          <Switch
                            id="batch-exclusive"
                            checked={batchConfig.isExclusive}
                            onCheckedChange={(checked) => setBatchConfig({ ...batchConfig, isExclusive: checked })}
                            data-testid="switch-batch-exclusive"
                          />
                          <span className="text-xs text-muted-foreground">
                            {batchConfig.isExclusive ? "Sim" : "Não"}
                          </span>
                        </div>
                      </div>

                      <Button 
                        onClick={applyBatchConfig} 
                        disabled={selectedVideos.size === 0}
                        size="sm"
                        data-testid="button-apply-batch"
                      >
                        Aplicar
                      </Button>

                      <Button
                        onClick={() => importMutation.mutate()}
                        disabled={selectedVideos.size === 0 || importMutation.isPending}
                        size="sm"
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
                    </div>
                  </div>
                </Card>
              </div>

              <ScrollArea className="flex-1" style={{ height: mode === "inline" ? '500px' : '400px' }}>
                <div className="space-y-3 pr-4">
                  {currentVideos.map((video) => {
                    const config = getVideoConfig(video.id);
                    const isSelected = selectedVideos.has(video.id);
                    
                    return (
                      <Card key={video.id} className={`p-4 ${isSelected ? 'border-primary' : ''}`}>
                        <div className="flex gap-4">
                          <div className="flex gap-3 items-start">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleVideo(video.id)}
                              data-testid={`checkbox-video-${video.id}`}
                            />
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-40 h-24 rounded-md object-cover flex-shrink-0"
                            />
                          </div>

                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
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

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Categoria</Label>
                                <Select 
                                  value={config.categoryId} 
                                  onValueChange={(value) => updateIndividualConfig(video.id, { categoryId: value })}
                                >
                                  <SelectTrigger className="h-8 text-xs" data-testid={`select-category-${video.id}`}>
                                    <SelectValue placeholder="Nenhuma" />
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

                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Conteúdo exclusivo</Label>
                                <div className="flex items-center space-x-2 h-8">
                                  <Switch
                                    checked={config.isExclusive}
                                    onCheckedChange={(checked) => updateIndividualConfig(video.id, { isExclusive: checked })}
                                    data-testid={`switch-exclusive-${video.id}`}
                                  />
                                  <span className="text-xs">
                                    {config.isExclusive ? "Sim" : "Não"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mostrar:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20" data-testid="select-items-per-page">
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    data-testid="button-previous-page"
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
                    data-testid="button-next-page"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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
    </div>
  );
}
