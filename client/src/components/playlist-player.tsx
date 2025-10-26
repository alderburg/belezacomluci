import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Play, Clock, List, X, Check } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { apiRequest } from "@/lib/queryClient";

interface PlaylistVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration?: string;
}

interface VideoProgress {
  id: string;
  userId: string;
  videoId: string;
  resourceId: string;
  maxTimeWatched: number;
  duration: number | null;
  progressPercentage: number;
  isCompleted: boolean;
  lastWatchedAt: string;
}

interface PlaylistPlayerProps {
  product: {
    id: string;
    title: string;
    description: string;
    fileUrl: string; // URL da playlist do YouTube
  };
}

export default function PlaylistPlayer({ product }: PlaylistPlayerProps) {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [videos, setVideos] = useState<PlaylistVideo[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [showPlaylist, setShowPlaylist] = useState(!isMobile);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const playerRef = useRef<HTMLIFrameElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extrair ID da playlist do YouTube
  const extractPlaylistId = (url: string): string => {
    const regex = /(?:list=|list\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };

  // Extrair ID do vídeo do YouTube
  const extractVideoId = (url: string): string => {
    const regex = /(?:v=|youtu\.be\/|embed\/|watch\?v=|v\/|e\/|watch\?.*&v=)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };

  // Buscar progresso dos vídeos
  const { data: videoProgressData, isLoading: isLoadingProgress } = useQuery<VideoProgress[]>({
    queryKey: ['/api/video-progress', product.id],
    enabled: !!user,
  });

  // Mutation to update video progress
  const progressMutation = useMutation({
    mutationFn: async ({ videoId, currentTime, duration }: { videoId: string; currentTime: number; duration: number }) => {
      if (!user) return;
      
      return await apiRequest("POST", "/api/video-progress", {
        videoId,
        resourceId: product.id,
        currentTime: Math.floor(currentTime),
        duration: Math.floor(duration),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-progress', product.id] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar progresso do vídeo:", error);
    },
  });

  // Mutation to register video watched activity
  const watchedMutation = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) return;
      
      await apiRequest("POST", "/api/activity", {
        action: "video_watched",
        resourceId: videoId,
        resourceType: "video",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
    },
    onError: (error: any) => {
      console.error("Erro ao registrar vídeo assistido:", error);
    },
  });

  useEffect(() => {
    // Simular busca dos vídeos da playlist
    // Em implementação real, você faria uma chamada para a API do YouTube
    const playlistId = extractPlaylistId(product.fileUrl);
    
    if (playlistId) {
      // Exemplo de dados simulados - em produção, você usaria a API do YouTube
      const mockVideos: PlaylistVideo[] = [
        {
          id: 'jUteWsk5WPg',
          title: 'Introdução ao Curso',
          thumbnail: 'https://img.youtube.com/vi/jUteWsk5WPg/maxresdefault.jpg',
          duration: '10:35'
        },
        {
          id: 'exemplo2',
          title: 'Módulo 1: Conceitos Básicos',
          thumbnail: 'https://img.youtube.com/vi/exemplo2/maxresdefault.jpg',
          duration: '15:20'
        },
        {
          id: 'exemplo3',
          title: 'Módulo 2: Práticas Avançadas',
          thumbnail: 'https://img.youtube.com/vi/exemplo3/maxresdefault.jpg',
          duration: '22:10'
        }
      ];

      setVideos(mockVideos);
      if (mockVideos.length > 0) {
        setCurrentVideoId(mockVideos[0].id);
      }
    }
  }, [product.fileUrl]);

  // Simular rastreamento de progresso do YouTube iframe
  useEffect(() => {
    if (!user || !currentVideoId) return;

    // Limpar intervalo anterior
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Simular atualização de progresso a cada 10 segundos
    // Em produção real, você usaria a YouTube IFrame API para obter o tempo real
    let simulatedTime = 0;
    const simulatedDuration = 600; // 10 minutos como exemplo

    progressIntervalRef.current = setInterval(() => {
      simulatedTime += 10; // Incrementar 10 segundos
      
      if (simulatedTime <= simulatedDuration) {
        progressMutation.mutate({
          videoId: currentVideoId,
          currentTime: simulatedTime,
          duration: simulatedDuration,
        });
      }
    }, 10000); // Atualizar a cada 10 segundos

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentVideoId, user]);

  const handleVideoSelect = (videoId: string) => {
    setCurrentVideoId(videoId);
    if (isMobile) {
      setShowPlaylist(false);
    }
    
    // Register video watched activity if user is logged in and video hasn't been watched yet
    if (user && !watchedVideos.has(videoId)) {
      watchedMutation.mutate(videoId);
      setWatchedVideos(prev => new Set(prev).add(videoId));
    }
  };

  const getVideoProgress = (videoId: string): number => {
    if (!videoProgressData) return 0;
    const progress = videoProgressData.find(p => p.videoId === videoId);
    return progress?.progressPercentage || 0;
  };

  const isVideoCompleted = (videoId: string): boolean => {
    if (!videoProgressData) return false;
    const progress = videoProgressData.find(p => p.videoId === videoId);
    return progress?.isCompleted || false;
  };

  const currentVideo = videos.find(v => v.id === currentVideoId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/produtos')}
              className="flex items-center"
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{product.title}</h1>
              <Badge variant="outline">Curso</Badge>
            </div>
          </div>

          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPlaylist(!showPlaylist)}
              data-testid="button-toggle-playlist"
            >
              {showPlaylist ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}
              {showPlaylist ? '' : 'Playlist'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Player Principal */}
        <div className={`flex-1 ${showPlaylist && !isMobile ? 'pr-80' : ''} relative`}>
          <div className="aspect-video bg-black">
            {currentVideoId ? (
              <iframe
                ref={playerRef}
                src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                data-testid="iframe-video-player"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Selecione um vídeo da playlist</p>
                </div>
              </div>
            )}
          </div>

          {/* Informações do vídeo */}
          {currentVideo && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">{currentVideo.title}</h2>
              <p className="text-muted-foreground mb-4">{product.description}</p>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                {currentVideo.duration && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {currentVideo.duration}
                  </div>
                )}
                <div>
                  Vídeo {videos.findIndex(v => v.id === currentVideoId) + 1} de {videos.length}
                </div>
                {isVideoCompleted(currentVideoId) && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3 mr-1" />
                    Completo
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Playlist Sidebar */}
        {showPlaylist && (
          <div className={`${isMobile ? 'fixed inset-0 bg-background z-50' : 'absolute right-0 top-0 bottom-0 w-80'} border-l border-border bg-card`}>
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Conteúdo do Curso</h3>
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPlaylist(false)}
                      data-testid="button-close-playlist"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {videos.length} vídeos
                </p>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2">
                  {videos.map((video, index) => {
                    const progress = getVideoProgress(video.id);
                    const completed = isVideoCompleted(video.id);
                    
                    return (
                      <div key={video.id}>
                        <Card 
                          className={`mb-2 cursor-pointer transition-colors hover:bg-accent ${
                            currentVideoId === video.id ? 'ring-2 ring-primary bg-accent' : ''
                          }`}
                          onClick={() => handleVideoSelect(video.id)}
                          data-testid={`card-video-${video.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex space-x-3">
                              <div className="relative w-20 h-12 flex-shrink-0 rounded overflow-hidden bg-muted">
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  {currentVideoId === video.id ? (
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                  ) : completed ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Play className="w-3 h-3 text-white" />
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {index + 1}
                                  </span>
                                  {video.duration && (
                                    <span className="text-xs text-muted-foreground">
                                      {video.duration}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-medium text-foreground line-clamp-2 mt-1">
                                  {video.title}
                                </h4>
                                
                                {/* Barra de Progresso */}
                                {user && progress > 0 && (
                                  <div className="mt-2" data-testid={`progress-bar-${video.id}`}>
                                    <Progress 
                                      value={progress} 
                                      className="h-1"
                                    />
                                    <span className="text-xs text-muted-foreground mt-1 block">
                                      {progress}% assistido
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
