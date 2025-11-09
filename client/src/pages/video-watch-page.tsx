import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useYouTubeStats } from "@/hooks/use-youtube-stats";
import { apiRequest } from "@/lib/queryClient";
import type { Video, Comment, Banner } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import ShareModal from "@/components/share-modal";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAccessControl } from "@/lib/premium-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MainContent } from "@/components/main-content";
import { PopupSystem } from "@/components/popup-system";
import { Progress } from "@/components/ui/progress";
import { ThumbsUp, Eye, MessageCircle, ArrowLeft, Send, Calendar, Play, Trash2, Share2, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVideoProgress } from "@/hooks/use-video-progress";
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

// Função para traduzir categorias
const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'makeup':
      return 'Maquiagem';
    case 'skincare':
      return 'Skincare';
    case 'hair':
      return 'Cabelos';
    case 'nails':
      return 'Unhas';
    case 'perfume':
      return 'Perfumes';
    default:
      return category;
  }
};

// Função para extrair ID do vídeo do YouTube - MOVIDA PARA FORA DO COMPONENTE
const getYouTubeVideoId = (url: string) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#\?]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/v\/)([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

export default function VideoWatchPage() {
  const [location, navigate] = useLocation();
  // Extract video ID from URL - suporta /video/:id, /videos/video/:id, /produtos/video/:id
  const videoId = location.includes('/video/')
    ? location.split('/video/')[1]?.split('?')[0]
    : null;

  console.log("VideoWatchPage - Current location:", location);
  console.log("VideoWatchPage - Extracted video ID:", videoId);

  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [needsYouTubeAuth, setNeedsYouTubeAuth] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [isLoadingVideoContent, setIsLoadingVideoContent] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [hasWatchedRegistered, setHasWatchedRegistered] = useState(false);
  const accessControl = useAccessControl();
  const playerRef = useRef<any>(null);

  // Buscar recurso (produto ou vídeo) de forma inteligente
  const { data: resource, isLoading, error, refetch } = useQuery<any>({
    queryKey: [`/api/resource/${videoId}`],
    queryFn: async () => {
      if (!videoId) throw new Error('No resource ID');

      console.log('Fetching video with ID:', videoId);

      // Tenta buscar como produto primeiro
      let response = await fetch(`/api/produtos/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Found as product:', data);
        return { ...data, _type: 'product' };
      }

      // Se não encontrou como produto, tenta como vídeo
      response = await fetch(`/api/videos/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Found as video:', data);
        return { ...data, _type: 'video' };
      }

      // Se nenhum dos dois funcionou, retorna erro
      throw new Error('Resource not found');
    },
    enabled: !!videoId,
    retry: false,
  });

  // Determina se é produto ou vídeo
  const product = resource?._type === 'product' ? resource : null;
  const video = resource?._type === 'video' ? resource : null;

  // Determina o ID do vídeo do YouTube
  const videoUrl = product?.fileUrl || video?.videoUrl || null;
  const youtubeVideoId = videoUrl ? getYouTubeVideoId(videoUrl) : null;

  // Hook para rastrear progresso do vídeo - DEVE VIR ANTES de usar saveProgress
  const { stopProgressSaving, saveProgress } = useVideoProgress({
    videoId: youtubeVideoId || '',
    resourceId: videoId || '',
    playerRef,
    enabled: !!user && !!youtubeVideoId && !!videoId && showVideo
  });

  // Reset video loaded state when video changes
  useEffect(() => {
    // Salvar progresso antes de trocar de vídeo
    if (saveProgress) {
      saveProgress();
    }
    
    setVideoLoaded(false);
    setShowVideo(false);
    setIsLoadingVideoContent(true);
    setHasWatchedRegistered(false);
  }, [videoId, saveProgress]);

  // Salvar progresso antes de sair da página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveProgress) {
        saveProgress();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && saveProgress) {
        saveProgress();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveProgress]);

  // Inicializar YouTube IFrame API e criar player quando vídeo for mostrado
  useEffect(() => {
    // Carregar script da YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Criar player quando vídeo for mostrado
  useEffect(() => {
    if (!showVideo || !youtubeVideoId) {
      return;
    }

    const initPlayer = () => {
      setTimeout(() => {
        const playerContainer = document.getElementById('youtube-player-container');
        if (!playerContainer) return;

        // Limpar player anterior se existir
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try {
            playerRef.current.destroy();
          } catch (e) {
            console.log('Error destroying player:', e);
          }
          playerRef.current = null;
        }

        // Limpar o container
        playerContainer.innerHTML = '';

        // Criar novo player
        try {
          playerRef.current = new window.YT.Player(playerContainer, {
            videoId: youtubeVideoId,
            playerVars: {
              autoplay: 1,
              rel: 0,
              modestbranding: 1,
              enablejsapi: 1,
            },
            events: {
              onReady: (event: any) => {
                console.log('YouTube player ready for video:', youtubeVideoId);
              },
              onStateChange: (event: any) => {
                // Salvar progresso quando pausar ou parar
                if ((event.data === 2 || event.data === 0) && saveProgress) { // 2 = PAUSED, 0 = ENDED
                  saveProgress();
                }
              }
            },
          });
        } catch (e) {
          console.error('Error creating YouTube player:', e);
        }
      }, 100);
    };

    // Se YT já está disponível, inicializar
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Caso contrário, aguardar o callback
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Cleanup
    return () => {
      if (stopProgressSaving) {
        stopProgressSaving();
      }
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {
          console.log('Cleanup error:', e);
        }
      }
    };
  }, [showVideo, youtubeVideoId, stopProgressSaving, saveProgress]);

  // Check access when resource loads
  useEffect(() => {
    if (resource && resource.isExclusive) {
      const accessResult = accessControl.checkAccess(resource.isExclusive);
      if (!accessResult.hasAccess) {
        // Redireciona imediatamente para home com o nome do conteúdo
        const encodedTitle = encodeURIComponent(resource.title);
        navigate(`/?showPremiumModal=true&contentType=video&contentTitle=${encodedTitle}`);
      }
    }
  }, [resource, accessControl, navigate]);

  // Get YouTube stats for the video
  const youtubeStats = useYouTubeStats(resource?.videoUrl || resource?.fileUrl || '');

  // Mutation to register video watched activity
  const watchedMutation = useMutation({
    mutationFn: async () => {
      if (!user || !videoId) return;

      await apiRequest("POST", "/api/activity", {
        action: "video_watched",
        resourceId: videoId,
        resourceType: "video",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      setHasWatchedRegistered(true);
    },
    onError: (error: any) => {
      console.error("Erro ao registrar vídeo assistido:", error);
    },
  });

  // Fetch comments
  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ["comments", videoId],
    queryFn: async () => {
      if (!videoId) return [];
      const response = await apiRequest("GET", `/api/comments/${videoId}?type=video`);
      if (!response.ok) return [];
      const result = await response.json();
      return Array.isArray(result) ? result : [];
    },
    enabled: !!videoId,
  });

  // Fetch video or course banners based on resource type
  const { data: videoBanners = [] } = useQuery({
    queryKey: ["banners", videoId, resource?._type],
    queryFn: async () => {
      if (!videoId) return [];
      
      // Se for produto (course_video ou course_playlist), buscar banners de curso
      const endpoint = resource?._type === 'product' 
        ? `/api/banners/course/${videoId}`
        : `/api/banners/video/${videoId}`;
      
      const response = await apiRequest("GET", endpoint);
      if (!response.ok) return [];
      const result = await response.json();
      return Array.isArray(result) ? result : [];
    },
    enabled: !!videoId && !!resource,
  });

  // Buscar progresso do vídeo
  const { data: videoProgressData } = useQuery<any>({
    queryKey: ['/api/video-progress', videoId],
    queryFn: async () => {
      if (!videoId) return null;
      const response = await fetch(`/api/video-progress/${videoId}`);
      if (!response.ok) return null;
      const data = await response.json();
      // A API retorna um array, pegamos o primeiro item se existir
      if (Array.isArray(data) && data.length > 0) {
        return data.find(p => p.videoId === youtubeVideoId) || data[0];
      }
      return null;
    },
    enabled: !!user && !!youtubeVideoId && !!videoId,
  });


  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/comments", {
        videoId: videoId,
        content,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao comentar');
      }
      return await response.json();
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
      queryClient.invalidateQueries({ queryKey: ["video", videoId] }); // Also invalidate video query for potential like count updates
      toast({
        title: "Comentário enviado!",
        description: "Seu comentário foi publicado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao enviar comentário",
        variant: "destructive",
      });
    },
  });

  const handleComment = () => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para comentar",
        variant: "destructive",
      });
      return;
    }
    if (!newComment.trim()) {
      toast({
        title: "Comentário vazio",
        description: "Escreva algo antes de enviar",
        variant: "destructive",
      });
      return;
    }
    commentMutation.mutate(newComment.trim());
  };

  // Mutação para curtir no YouTube
  const youtubeLikeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/videos/${videoId}/youtube-like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like' }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.needsAuth) {
          // Obtém URL de autorização e abre modal imediatamente
          const authResponse = await fetch('/api/auth/youtube', {
            credentials: 'include'
          });

          if (authResponse.ok) {
            const { authUrl } = await authResponse.json();
            setAuthUrl(authUrl);
            setShowAuthModal(true);
            setNeedsYouTubeAuth(true);
          }

          throw new Error('YouTube authorization required');
        }
        throw new Error(errorData.message || 'Failed to like video on YouTube');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setNeedsYouTubeAuth(false);
      toast({
        title: "Sucesso!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      if (error.message !== 'YouTube authorization required') {
        toast({
          title: "Erro",
          description: error.message || "Falha ao curtir vídeo no YouTube",
          variant: "destructive",
        });
      }
    },
  });

  const handleYouTubeLike = async () => {
    // Sempre tenta curtir primeiro
    youtubeLikeMutation.mutate();
  };

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await apiRequest("DELETE", `/api/comments/${commentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir comentário');
      }
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch comments first
      await queryClient.invalidateQueries({ queryKey: ["comments", videoId] });

      // Only close modal and show success after refetch
      setShowDeleteDialog(false);
      setDeleteCommentId(null);
      toast({
        title: "Comentário excluído!",
        description: "O comentário foi removido com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir comentário",
        variant: "destructive",
      });
    },
  });

  const handleDeleteComment = (commentId: string) => {
    setDeleteCommentId(commentId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteComment = () => {
    if (deleteCommentId) {
      deleteCommentMutation.mutate(deleteCommentId);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setNeedsYouTubeAuth(false);
    setAuthUrl('');
    toast({
      title: "Autorização concluída",
      description: "Agora você pode curtir o vídeo no YouTube!",
    });
  };

  const handlePlayVideo = () => {
    setShowVideo(true);

    // Register video watched activity if user is logged in and hasn't been registered yet
    if (user && !hasWatchedRegistered) {
      watchedMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
          <div className="container mx-auto px-6 py-8">
            <div className="animate-pulse">
              {/* Back button skeleton */}
              <div className="h-10 bg-muted rounded w-32 mb-6"></div>

              {/* Video player skeleton */}
              <div className="relative w-full aspect-video bg-muted rounded-lg mb-6 animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20 rounded-lg"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-muted-foreground/30 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-muted-foreground/50 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Video title skeleton */}
              <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>

              {/* Video stats skeleton */}
              <div className="flex items-center gap-4 mb-4">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>

              {/* Like button skeleton */}
              <div className="h-10 bg-muted rounded w-24 mb-6"></div>

              {/* Description skeleton */}
              <div className="space-y-2 mb-8">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>

              {/* Comments section skeleton */}
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-40 mb-4"></div>
                {/* Comment skeletons */}
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  console.log("VideoWatchPage state:", { videoId, isLoading, error, video, product, resource });

  if (error || (!resource && !isLoading)) {
    console.log("Error or no resource:", { error, resource, videoId, isLoading });
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
          <div className="container mx-auto px-6 py-8">
            <h1 className="text-2xl font-bold mb-4">Vídeo não encontrado</h1>
            <p className="text-muted-foreground mb-4">
              O vídeo que você está tentando acessar não existe ou foi removido.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ID do vídeo: {videoId || 'Não encontrado'}
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-600 font-medium mb-2">Detalhes do erro:</p>
                <p className="text-red-500 text-sm">
                  {error instanceof Error ? error.message : 'Erro desconhecido ao carregar vídeo'}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={() => navigate("/videos")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para vídeos
              </Button>
              <Button onClick={() => refetch()} variant="outline">
                Tentar novamente
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  console.log("Resource data:", resource);
  console.log("Product:", product);
  console.log("Video:", video);
  console.log("Video URL:", videoUrl);
  console.log("YouTube video ID:", youtubeVideoId);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Google Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full max-w-md mx-4">
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Autorização YouTube</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAuthModal(false)}
                    className="h-6 w-6 p-0"
                  >
                    ✕
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Para curtir vídeos no YouTube, você precisa autorizar o acesso à sua conta.
                </p>
                <div className="w-full h-96 border rounded-lg overflow-hidden">
                  <iframe
                    src={authUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    title="Google Authorization"
                    onLoad={(e) => {
                      // Monitora mudanças na URL do iframe para detectar sucesso
                      const iframe = e.target as HTMLIFrameElement;
                      try {
                        const checkCallback = setInterval(() => {
                          try {
                            const iframeUrl = iframe.contentWindow?.location.href;
                            if (iframeUrl && iframeUrl.includes('/videos')) {
                              clearInterval(checkCallback);
                              handleAuthSuccess();
                            }
                          } catch (error) {
                            // Cross-origin error é esperado, continua verificando
                          }
                        }, 1000);

                        // Limpa o intervalo após 5 minutos
                        setTimeout(() => clearInterval(checkCallback), 300000);
                      } catch (error) {
                        console.log('Monitoring auth callback');
                      }
                    }}
                  />
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowAuthModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAuthSuccess}
                    variant="default"
                  >
                    Concluído
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : ''}`}>
        {/* Added PopupSystem for page-specific popups */}
        {product ? (
          <PopupSystem 
            trigger="page_specific" 
            targetPage="course_specific" 
            targetCourseId={videoId} 
          />
        ) : (
          <PopupSystem 
            trigger="page_specific" 
            targetPage="video_specific" 
            targetVideoId={videoId} 
          />
        )}
        <div className={`container mx-auto px-6 py-8 ${!hasActiveBanners ? (isMobile ? 'pt-32' : 'pt-24') : ''}`}>
          <Button
            variant="ghost"
            onClick={() => navigate(product ? "/produtos" : "/videos")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para {product ? "produtos" : "vídeos"}
          </Button>

          {/* Main content with video and banners */}
          <div className="flex gap-6">
            {/* Video content - main area */}
            <div className={`flex-1 ${videoBanners.length > 0 ? 'lg:pr-6' : ''}`}>
              {/* Video player */}
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-6">
            {/* Thumbnail background */}
            {(product?.coverImageUrl || video?.thumbnailUrl) && (
              <img
                src={product?.coverImageUrl || video?.thumbnailUrl}
                alt={product?.title || video?.title || 'Thumbnail'}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Play button overlay */}
            {!showVideo && youtubeVideoId && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer z-20 group"
                onClick={handlePlayVideo}
              >
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors duration-200 group-hover:scale-110 transform">
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
              </div>
            )}

            {/* YouTube iframe - só carrega quando showVideo for true */}
            {showVideo && youtubeVideoId ? (
              <div id="youtube-player-container" ref={playerRef} className="absolute inset-0 w-full h-full z-10">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
                  title={video?.title || 'Vídeo'}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => {
                    console.log('Video iframe loaded');
                    setVideoLoaded(true);
                  }}
                />
              </div>
            ) : !youtubeVideoId ? (
              <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                <p>URL do vídeo inválida</p>
              </div>
            ) : null}
          </div>

          {/* Barra de Progresso */}
          {user && videoProgressData && videoProgressData.progressPercentage > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Progresso do vídeo
                </span>
                <span className="text-sm font-medium text-foreground flex items-center gap-1">
                  {videoProgressData.isCompleted && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {Math.round(videoProgressData.progressPercentage)}%
                </span>
              </div>
              <Progress 
                value={videoProgressData.progressPercentage} 
                className="h-2"
              />
            </div>
          )}

          {/* Video info */}
          <div className="space-y-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {product?.title || video?.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>
                    {youtubeStats.loading
                      ? 'Carregando...'
                      : `${youtubeStats.views.toLocaleString()} visualizações`
                    }
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {(product?.createdAt || video?.createdAt)
                      ? formatDistanceToNow(new Date(product?.createdAt || video?.createdAt), { addSuffix: true, locale: ptBR })
                      : 'Data não disponível'}
                  </span>
                </div>
                {(product?.categoryId || video?.category) && (
                  <Badge variant="outline">
                    {product ? 'Curso' : getCategoryLabel(video.category)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleYouTubeLike}
                  disabled={youtubeLikeMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  {youtubeLikeMutation.isPending
                    ? "Curtindo..."
                    : youtubeStats.loading
                      ? "0"
                      : youtubeStats.likes.toLocaleString()
                  }
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
              {(product?.isExclusive || video?.isExclusive) && (
                <Badge className="bg-purple-100 text-purple-700">Exclusivo</Badge>
              )}
            </div>

            {(product?.description || video?.description) && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {product?.description || video?.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

              {/* Comments section */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <MessageCircle className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">
                      Comentários ({comments.length})
                    </h3>
                  </div>

              {user && (
                <div className="mb-8 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        placeholder="Adicione um comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          onClick={handleComment}
                          disabled={commentMutation.isPending || !newComment.trim()}
                          size="sm"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {commentMutation.isPending ? "Enviando..." : "Comentar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Seja o primeiro a comentar!
                  </p>
                ) : (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={comment.user.avatar || undefined} />
                        <AvatarFallback>
                          {comment.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">
                            {comment.user.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                              locale: ptBR
                            }) : 'Agora'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground break-words">
                          {comment.content}
                        </p>
                      </div>
                      {user && (user.id === comment.user.id || user.isAdmin) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
            </div>

            {/* Video Banners - Side area */}
            {videoBanners.length > 0 && (
              <div className="hidden lg:block w-80">
                <div className="space-y-4">
                  {videoBanners
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((banner) => (
                    <Card key={banner.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        <div className="relative aspect-square w-full">
                          {banner.imageUrl && (
                            <img
                              src={banner.imageUrl}
                              alt={banner.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
                            {banner.showTitle && (
                              <h3 className="text-white font-semibold text-lg mb-1">
                                {banner.title}
                              </h3>
                            )}
                            {banner.showDescription && banner.description && (
                              <p className="text-white/90 text-sm mb-3 line-clamp-2">
                                {banner.description}
                              </p>
                            )}
                            {banner.showButton && banner.linkUrl && (
                              <Button
                                size="sm"
                                className="w-fit bg-white text-black hover:bg-white/90"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(banner.linkUrl, '_blank');
                                }}
                              >
                                Ver mais
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Comment Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Comentário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCommentMutation.isPending}
            >
              {deleteCommentMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={`${window.location.origin}/video/${videoId}`}
        title={video?.title || 'Vídeo'}
        description={video?.description}
      />

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        contentType="video"
        contentTitle={video?.title}
      />
    </div>
  );
}