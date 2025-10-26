import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useYouTubeStats } from "@/hooks/use-youtube-stats";
import { apiRequest } from "@/lib/queryClient";
import type { Video, Comment, Banner } from "@shared/schema";
import ShareModal from "@/components/share-modal";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import { useAccessControl } from "@/lib/premium-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { PopupSystem } from "@/components/popup-system";
import { useRef } from "react";
import { useVideoProgress } from "@/hooks/use-video-progress"; // Importar o hook

import {
  ThumbsUp,
  Eye,
  MessageCircle,
  ArrowLeft,
  Send,
  Calendar,
  Play,
  Trash2,
  Share2,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Skeleton } from "@/components/ui/skeleton";

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

export default function VideoMobilePage() {
  const [location, navigate] = useLocation();
  // Extract video ID from URL - suporta /video/:id, /videos/video/:id, /produtos/video/:id
  const videoId = location.includes('/video/')
    ? location.split('/video/')[1]?.split('?')[0]
    : null;

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
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

  // Inicializar YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Buscar recurso (produto ou vídeo) de forma inteligente
  const { data: resource, isLoading, error, refetch } = useQuery<any>({
    queryKey: [`/api/resource/${videoId}`],
    queryFn: async () => {
      if (!videoId) throw new Error('No resource ID');

      // Tenta buscar como produto primeiro
      let response = await fetch(`/api/produtos/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        return { ...data, _type: 'product' };
      }

      // Se não encontrou como produto, tenta como vídeo
      response = await fetch(`/api/videos/${videoId}`);
      if (response.ok) {
        const data = await response.json();
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

  // Determina o ID do vídeo do YouTube ANTES do hook
  const videoUrl = video?.videoUrl || product?.fileUrl;
  const youtubeVideoId = videoUrl ? getYouTubeVideoId(videoUrl) : null;

  // Hook para rastrear progresso do vídeo - MOVIDO PARA O TOPO, ANTES DOS RETURNS
  const { stopProgressSaving, saveProgress } = useVideoProgress({
    videoId: youtubeVideoId || '',
    resourceId: videoId || '',
    playerRef,
    enabled: !!user && !!youtubeVideoId && !!videoId && showVideo
  });

  // Reset video loaded state when video changes
  useEffect(() => {
    setShowVideo(false);
    setIsLoadingVideoContent(true);
    setHasWatchedRegistered(false);
  }, [videoId]);

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

  // Criar player quando vídeo for mostrado
  useEffect(() => {
    if (!showVideo || !youtubeVideoId) {
      return;
    }

    const initPlayer = () => {
      setTimeout(() => {
        // Limpar player anterior se existir
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try {
            playerRef.current.destroy();
          } catch (e) {
            console.log('Error destroying player:', e);
          }
          playerRef.current = null;
        }

        // Criar novo player
        try {
          if (window.YT && window.YT.Player) {
            playerRef.current = new window.YT.Player('youtube-player-container-mobile', {
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
                  if ((event.data === 2 || event.data === 0) && saveProgress) {
                    saveProgress();
                  }
                }
              },
            });
          }
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
        } catch (e) {
          console.log('Cleanup error:', e);
        }
        playerRef.current = null;
      }
    };
  }, [showVideo, youtubeVideoId, stopProgressSaving, saveProgress]);

  // Check access when resource loads
  useEffect(() => {
    if (resource && resource.isExclusive) {
      const accessResult = accessControl.checkAccess(resource.isExclusive);
      if (!accessResult.hasAccess) {
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
      queryClient.invalidateQueries({ queryKey: ["video", videoId] });
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
      await queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
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

    if (user && !hasWatchedRegistered) {
      watchedMutation.mutate();
    }
  };

  const handleBackClick = () => {
    navigate(product ? '/produtos' : '/videos');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header - Fixo */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-left flex-1 ml-4">
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Play className="h-5 w-5 text-primary" />
          </div>
        </div>

        <div className="pt-24 px-4 py-6 space-y-6">
          {/* Video player skeleton */}
          <div className="aspect-video bg-muted rounded-lg animate-pulse">
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 bg-muted-foreground/30 rounded-full"></div>
            </div>
          </div>

          {/* Video info skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>

          {/* Description skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Comments skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  if (error || (!resource && !isLoading)) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header - Fixo */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted"
              onClick={handleBackClick}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-lg font-semibold text-foreground">Erro</h1>
              <p className="text-sm text-muted-foreground">Vídeo não encontrado</p>
            </div>
            <Play className="h-5 w-5 text-primary" />
          </div>
        </div>

        <div className="pt-24 px-4 py-8 text-center">
          <h2 className="text-xl font-bold mb-4">Vídeo não encontrado</h2>
          <p className="text-muted-foreground mb-2">
            O vídeo que você está tentando acessar não existe ou foi removido.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            ID: {videoId || 'Não encontrado'}
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-red-600 font-medium mb-2">Detalhes do erro:</p>
              <p className="text-red-500 text-sm">
                {error instanceof Error ? error.message : 'Erro desconhecido ao carregar vídeo'}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Button onClick={handleBackClick} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para vídeos
            </Button>
            <Button onClick={() => refetch()} variant="outline" className="w-full">
              Tentar novamente
            </Button>
          </div>
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Google Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-md">
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
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Para curtir vídeos no YouTube, você precisa autorizar o acesso à sua conta.
                </p>
                <div className="w-full h-80 border rounded-lg overflow-hidden">
                  <iframe
                    src={authUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    title="Google Authorization"
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

      {/* Header - Fixo */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground line-clamp-1">
              {product?.title || video?.title || 'Vídeo'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {product ? 'Curso' : 'Assistir vídeo'}
            </p>
          </div>
          <Play className="h-5 w-5 text-primary" />
        </div>
      </div>

      <PopupSystem trigger="page_specific" targetPage="video_specific" targetVideoId={videoId} />

      {/* Content com padding-top para compensar header fixo */}
      <div className="pt-24 px-4 py-6 space-y-6">
        {/* Video player */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          {(product?.coverImageUrl || video?.thumbnailUrl) && (
            <img
              src={product?.coverImageUrl || video?.thumbnailUrl}
              alt={product?.title || video?.title || 'Thumbnail'}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {!showVideo && youtubeVideoId && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer z-20 group"
              onClick={handlePlayVideo}
            >
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors duration-200 group-hover:scale-110 transform">
                <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
              </div>
            </div>
          )}

          {/* YouTube player - só carrega quando showVideo for true */}
          {showVideo && youtubeVideoId ? (
            <div id="youtube-player-container-mobile" className="absolute inset-0 w-full h-full z-10" />
          ) : !youtubeVideoId ? (
            <div className="absolute inset-0 flex items-center justify-center text-white z-10">
              <p>URL do vídeo inválida</p>
            </div>
          ) : null}
        </div>

        {/* Video info */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {product?.title || video?.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
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

          <div className="flex items-center gap-3">
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
                <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                  {product?.description || video?.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Comments section */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold">
                Comentários ({comments.length})
              </h3>
            </div>

            {user && (
              <div className="mb-6 space-y-3">
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
                      className="min-h-[60px] resize-none text-sm"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        onClick={handleComment}
                        disabled={commentMutation.isPending || !newComment.trim()}
                        size="sm"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {commentMutation.isPending ? "Enviando..." : "Comentar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">
                  Seja o primeiro a comentar!
                </p>
              ) : (
                comments.map((comment: any) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarImage src={comment.user.avatar || undefined} />
                      <AvatarFallback className="text-xs">
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
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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

      <MobileBottomNav />
    </div>
  );
}