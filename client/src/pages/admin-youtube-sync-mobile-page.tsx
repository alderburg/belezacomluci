import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Youtube, Loader2, CheckCircle2, Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from "react";
import { apiRequest } from '@/lib/queryClient';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VideoImportProgressModal } from "@/components/video-import-progress-modal";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function AdminYouTubeSyncMobilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [syncedVideos, setSyncedVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncComplete, setSyncComplete] = useState(false);
  const [hasAttemptedSync, setHasAttemptedSync] = useState(false);

  const [batchConfig, setBatchConfig] = useState({
    categoryId: "",
    isExclusive: false,
  });

  const [individualConfigs, setIndividualConfigs] = useState<Map<string, VideoConfig>>(new Map());
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

  const [showImportProgress, setShowImportProgress] = useState(false);
  const [importProgress, setImportProgress] = useState({
    currentIndex: 0,
    importedCount: 0,
    failedCount: 0,
    currentVideo: null as YouTubeVideo | null,
  });
  const [isCancellingImport, setIsCancellingImport] = useState(false);
  const cancelImportRef = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: channelData, isLoading: isLoadingChannelId } = useQuery<{ channelId: string | null }>({
    queryKey: ["/api/youtube-channel-id"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || isAuthLoading || !channelData?.channelId || hasAttemptedSync) {
      return;
    }

    setHasAttemptedSync(true);

    const timer = setTimeout(() => {
      handleSync(channelData.channelId);
    }, 100);

    return () => clearTimeout(timer);
  }, [user, isAuthLoading, channelData?.channelId]);

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
    
    if (config.categoryId) {
      setValidationErrors(prev => {
        const newErrors = new Set(prev);
        newErrors.delete(videoId);
        return newErrors;
      });
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
    
    if (batchConfig.categoryId) {
      setValidationErrors(prev => {
        const newErrors = new Set(prev);
        selectedVideos.forEach(videoId => {
          newErrors.delete(videoId);
        });
        return newErrors;
      });
    }
    
    toast({
      title: "Configuração aplicada",
      description: `Configurações aplicadas a ${selectedVideos.size} vídeo(s) selecionado(s)`,
    });
  };

  const importVideosSequentially = async () => {
    if (!syncedVideos || syncedVideos.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhum vídeo para importar",
      });
      return;
    }

    const videosWithoutCategory = Array.from(selectedVideos).filter(videoId => {
      const config = getVideoConfig(videoId);
      return !config.categoryId || config.categoryId.trim() === '';
    });

    if (videosWithoutCategory.length > 0) {
      const description = videosWithoutCategory.length === 1
        ? 'Por favor, verifique o vídeo selecionado e escolha uma categoria antes de importar.'
        : `Por favor, verifique os ${videosWithoutCategory.length} vídeos selecionados e escolha uma categoria para cada um antes de importar.`;
      
      setValidationErrors(new Set(videosWithoutCategory));
      
      toast({
        variant: "destructive",
        title: "O campo Categoria é obrigatório",
        description,
      });

      const firstVideoWithoutCategory = videosWithoutCategory[0];
      const element = document.querySelector(`[data-video-id="${firstVideoWithoutCategory}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return;
    }

    const videosToImport = syncedVideos.filter(video => selectedVideos.has(video.id));
    
    cancelImportRef.current = false;
    setIsCancellingImport(false);
    setImportProgress({
      currentIndex: 0,
      importedCount: 0,
      failedCount: 0,
      currentVideo: null,
    });
    setShowImportProgress(true);

    let importedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < videosToImport.length; i++) {
      if (cancelImportRef.current) {
        toast({
          title: "Importação cancelada",
          description: `${importedCount} vídeo(s) importado(s) com sucesso. ${videosToImport.length - i} restante(s) não foram importados.`,
        });
        break;
      }

      const video = videosToImport[i];
      const config = getVideoConfig(video.id);

      setImportProgress({
        currentIndex: i + 1,
        importedCount,
        failedCount,
        currentVideo: video,
      });

      try {
        const res = await apiRequest("POST", "/api/videos", {
          title: video.title,
          description: video.description,
          videoUrl: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          type: "video",
          categoryId: config.categoryId,
          isExclusive: config.isExclusive,
        });

        if (!res.ok) {
          throw new Error(`Erro ao importar: ${video.title}`);
        }

        importedCount++;
      } catch (error) {
        failedCount++;
        setImportProgress(prev => ({
          ...prev,
          failedCount: prev.failedCount + 1,
        }));
      }

      setImportProgress(prev => ({
        ...prev,
        importedCount,
      }));
    }

    setShowImportProgress(false);
    queryClient.invalidateQueries({ queryKey: ["/api/videos"] });

    if (!cancelImportRef.current) {
      if (failedCount === 0) {
        toast({
          title: "Sucesso!",
          description: `${importedCount} vídeo(s) importado(s) com sucesso!`,
        });
      } else {
        toast({
          title: "Importação concluída com erros",
          description: `${importedCount} vídeo(s) importado(s), ${failedCount} falha(s).`,
        });
      }
      handleBackClick();
    }
  };

  const handleCancelImport = () => {
    setIsCancellingImport(true);
    cancelImportRef.current = true;
    
    toast({
      title: "Cancelando importação",
      description: "Aguarde o vídeo atual terminar...",
    });
  };

  const importMutation = useMutation({
    mutationFn: importVideosSequentially,
    onError: (error: Error) => {
      setShowImportProgress(false);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao importar vídeos",
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin/videos-mobile');
  };

  const isLoading = isAuthLoading || isLoadingChannelId || (isSyncing && !syncComplete);
  const hasVideos = syncedVideos && syncedVideos.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted"
            onClick={handleBackClick}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-2">
            <h1 className="text-lg font-semibold text-foreground">Sincronizar YouTube</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Buscando vídeos..."
                : hasVideos
                ? `${syncedVideos.length} vídeos disponíveis`
                : "Todos vídeos sincronizados"}
            </p>
          </div>
          <Youtube className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-24 px-4 pb-24">
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
        ) : syncComplete && hasVideos ? (
          <div className="space-y-4">
            {/* Botões de ação */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleAll}
                className="flex-1"
                data-testid="button-toggle-all"
              >
                {selectedVideos.size === syncedVideos.length ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={selectedVideos.size === 0 || importMutation.isPending}
                size="sm"
                className="flex-1"
                data-testid="button-import"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${selectedVideos.size}`
                )}
              </Button>
            </div>

            {/* Configuração em lote */}
            {selectedVideos.size > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Aplicar a {selectedVideos.size} selecionado(s):</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="batch-category" className="text-xs">
                      Categoria <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={batchConfig.categoryId}
                      onValueChange={(value) => setBatchConfig({ ...batchConfig, categoryId: value })}
                    >
                      <SelectTrigger id="batch-category" data-testid="select-batch-category">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="batch-exclusive" className="text-xs">Conteúdo exclusivo</Label>
                    <div className="flex items-center space-x-2">
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
                    className="w-full"
                  >
                    Aplicar configuração
                  </Button>
                </div>
              </Card>
            )}

            {/* Lista de vídeos */}
            <div className="text-sm text-muted-foreground mb-2">
              {selectedVideos.size} de {syncedVideos.length} vídeos selecionados
            </div>

            <div className="space-y-3">
              {syncedVideos.map((video) => {
                const config = getVideoConfig(video.id);
                const isSelected = selectedVideos.has(video.id);

                return (
                  <Card 
                    key={video.id} 
                    data-video-id={video.id} 
                    className={`p-4 ${isSelected ? 'border-primary' : ''}`}
                  >
                    <div className="space-y-3">
                      {/* Header com checkbox e thumbnail */}
                      <div className="flex gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleVideo(video.id)}
                          data-testid={`checkbox-video-${video.id}`}
                          className="mt-1"
                        />
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-24 h-16 rounded-md object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {video.duration}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {new Date(video.publishedAt).toLocaleDateString("pt-BR")}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Configurações */}
                      <div className="space-y-3 pt-3 border-t border-border">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Categoria <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={config.categoryId}
                            onValueChange={(value) => updateIndividualConfig(video.id, { categoryId: value })}
                          >
                            <SelectTrigger 
                              className={`text-xs ${validationErrors.has(video.id) ? 'border-destructive' : ''}`}
                              data-testid={`select-category-${video.id}`}
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {validationErrors.has(video.id) && (
                            <p className="text-xs text-destructive">Categoria obrigatória</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Conteúdo exclusivo</Label>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={config.isExclusive}
                              onCheckedChange={(checked) => updateIndividualConfig(video.id, { isExclusive: checked })}
                              data-testid={`switch-exclusive-${video.id}`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {config.isExclusive ? "Sim" : "Não"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : syncComplete && !hasVideos ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
            <p className="text-lg font-medium">Tudo sincronizado!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Todos os vídeos do canal já estão cadastrados no sistema
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackClick}
              className="mt-4"
            >
              Voltar para vídeos
            </Button>
          </div>
        ) : null}
      </div>

      <VideoImportProgressModal
        open={showImportProgress}
        totalVideos={Array.from(selectedVideos).length}
        currentVideoIndex={importProgress.currentIndex}
        currentVideoTitle={importProgress.currentVideo?.title || "Preparando..."}
        currentVideoThumbnail={importProgress.currentVideo?.thumbnailUrl || ""}
        importedCount={importProgress.importedCount}
        failedCount={importProgress.failedCount}
        onCancel={handleCancelImport}
        isCancelling={isCancellingImport}
      />

      <MobileBottomNav />
    </div>
  );
}
