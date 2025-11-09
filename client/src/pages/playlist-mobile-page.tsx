import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import ShareModal from '@/components/share-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Clock, List, X, Eye, Heart, ThumbsUp, Calendar, MessageCircle, Send, Trash2, Share2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useYouTubeStats } from '@/hooks/use-youtube-stats';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PremiumUpgradeModal } from '@/components/premium-upgrade-modal';
import { useAccessControl } from '@/lib/premium-access';
import { PopupSystem } from '@/components/popup-system';
import MobileBottomNav from '@/components/mobile-bottom-nav';
import { useVideoProgress } from '@/hooks/use-video-progress';
import { Progress } from '@/components/ui/progress';
import BannerCarousel from '@/components/banner-carousel';

interface Product {
  id: string;
  title: string;
  description: string;
  type: string;
  fileUrl: string;
  coverImageUrl?: string;
  isExclusive: boolean;
  isActive: boolean;
  createdAt: string;
  category?: string;
}

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

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: new (
        playerId: string,
        options: {
          height: string;
          width: string;
          videoId: string;
          playerVars?: { [key: string]: string | number };
          events?: {
            onReady: (event: { target: any }) => void;
            onStateChange: (event: { target: any; data: number }) => void;
            onPlaybackQualityChange: (event: { target: any; data: string }) => void;
            onError: (event: { target: any; data: number }) => void;
            onApiChange: (event: { target: any }) => void;
          };
        }
      ) => any; // Tipo genérico para o player, pode ser aprimorado
    };
  }
}

const YOUTUBE_API_URL = 'https://www.youtube.com/iframe_api';

export default function PlaylistMobilePage() {

  const [location, navigate] = useLocation();
  // Extract ID from URL - suporta /playlist/:id, /videos/playlist/:id, /produtos/playlist/:id
  const resourceId = location.includes('/playlist/')
    ? location.split('/playlist/')[1]?.split('?')[0]
    : null;

  const [videos, setVideos] = useState<PlaylistVideo[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const accessControl = useAccessControl();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [isLoadingVideoContent, setIsLoadingVideoContent] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [needsYouTubeAuth, setNeedsYouTubeAuth] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Hook para rastrear progresso do vídeo - DEVE VIR ANTES de usar saveProgress
  const { stopProgressSaving, saveProgress } = useVideoProgress({
    videoId: currentVideoId,
    resourceId: resourceId || '',
    playerRef,
    enabled: !!user && !!currentVideoId && !!resourceId && showVideo
  });

  // Carregar a API do YouTube IFrame Player
  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = YOUTUBE_API_URL;
        document.body.appendChild(tag);
      }
    };
    loadYouTubeAPI();
  }, []);

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

  // Buscar progresso de todos os vídeos da playlist
  const { data: videoProgressData } = useQuery<VideoProgress[]>({
    queryKey: ['/api/video-progress', resourceId],
    enabled: !!user && !!resourceId,
  });

  // Função helper para obter progresso de um vídeo específico
  const getVideoProgress = (videoId: string): number => {
    if (!videoProgressData) return 0;
    const progress = videoProgressData.find(p => p.videoId === videoId);
    return progress?.progressPercentage || 0;
  };

  // Função helper para verificar se vídeo está completo
  const isVideoCompleted = (videoId: string): boolean => {
    if (!videoProgressData) return false;
    const progress = videoProgressData.find(p => p.videoId === videoId);
    return progress?.isCompleted || false;
  };

  // Criar player quando vídeo for mostrado
  useEffect(() => {
    if (!showVideo || !currentVideoId || !playerContainerRef.current) {
      return;
    }

    const initPlayer = () => {
      // Aguardar um pouco para garantir que o container está pronto
      setTimeout(() => {
        if (!playerContainerRef.current) return;

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
        if (playerContainerRef.current) {
          playerContainerRef.current.innerHTML = '';
        }

        // Criar novo player
        try {
          playerRef.current = new window.YT.Player(playerContainerRef.current, {
            videoId: currentVideoId,
            playerVars: {
              autoplay: 1,
              rel: 0,
              modestbranding: 1,
              enablejsapi: 1,
            },
            events: {
              onReady: (event: any) => {
                console.log('YouTube player ready for video:', currentVideoId);
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
        } catch (e) {
          console.log('Cleanup error:', e);
        }
        playerRef.current = null;
      }
    };
  }, [showVideo, currentVideoId, stopProgressSaving]);

  // --- Fim do Rastreamento de progresso ---

  // Resetar scroll do modal quando abrir
  useEffect(() => {
    if (showPlaylistModal) {
      // Pequeno delay para garantir que o modal renderizou
      setTimeout(() => {
        const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          scrollArea.scrollTop = 0;
        }
      }, 0);
    }
  }, [showPlaylistModal]);

  // Scroll para o topo quando a página carrega
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Buscar recurso (produto ou vídeo) de forma inteligente
  const { data: resource, isLoading, error: hasError } = useQuery<any>({
    queryKey: [`/api/resource/${resourceId}`],
    queryFn: async () => {
      if (!resourceId) throw new Error('No resource ID');

      // Tenta buscar como produto primeiro
      let response = await fetch(`/api/produtos/${resourceId}`);
      if (response.ok) {
        const data = await response.json();
        return { ...data, _type: 'product' };
      }

      // Se não encontrou como produto, tenta como vídeo
      response = await fetch(`/api/videos/${resourceId}`);
      if (response.ok) {
        const data = await response.json();
        return { ...data, _type: 'video' };
      }

      // Se nenhum dos dois funcionou, retorna erro
      throw new Error('Resource not found');
    },
    enabled: !!resourceId,
    retry: false,
  });

  // Determina se é produto ou vídeo
  const product = resource?._type === 'product' ? resource : null;
  const video = resource?._type === 'video' ? resource : null;

  // Check access when resource loads
  useEffect(() => {
    if (resource && resource.isExclusive) {
      const accessResult = accessControl.checkAccess(resource.isExclusive);
      if (!accessResult.hasAccess) {
        const encodedTitle = encodeURIComponent(resource.title);
        const contentType = product ? 'product' : 'video';
        navigate(`/?showPremiumModal=true&contentType=${contentType}&contentTitle=${encodedTitle}`);
      }
    }
  }, [resource, accessControl, navigate, product]);

  // Extrair ID da playlist do YouTube
  const extractPlaylistId = (url: string): string | null => {
    const regex = /(?:list=|list\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Extrair ID do vídeo do YouTube
  const extractVideoId = (url: string): string | null => {
    const regex = /(?:v=|youtu\.be\/|embed\/|watch\?v=|v\/|e\/|watch\?.*&v=)([^&\n?#]+)/;
    const match = url.match(regex);
    if (match && match[1]) {
      let videoId = match[1];
      // Remove qualquer parâmetro adicional
      if (videoId.includes('?')) {
        videoId = videoId.split('?')[0];
      }
      if (videoId.includes('&')) {
        videoId = videoId.split('&')[0];
      }
      return videoId;
    }
    return null;
  };

  // Buscar vídeos reais da playlist do YouTube via backend
  const fetchPlaylistVideos = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/youtube/playlist/${playlistId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch playlist: ${response.status}`);
      }

      const data = await response.json();

      // A API retorna um objeto com { playlistTitle, playlistDescription, playlistThumbnail, videos }
      const videos = data.videos || [];

      if (!Array.isArray(videos)) {
        return [];
      }

      return videos.map((video: any) => ({
        id: video.id,
        title: video.title || 'Título não disponível',
        thumbnail: video.thumbnail || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
        duration: video.duration || 'N/A'
      }));

    } catch (error) {
      console.error('Erro ao buscar playlist via API:', error);
      toast({
        title: "Erro ao carregar playlist",
        description: "Não foi possível carregar os vídeos da playlist.",
        variant: "destructive"
      });
      return [];
    }
  };

  useEffect(() => {
    if (resource) {
      const resourceUrl = product ? resource.fileUrl : (video ? resource.videoUrl : null);

      if (resourceUrl) {
        const playlistId = extractPlaylistId(resourceUrl);
        const videoId = extractVideoId(resourceUrl);

        setIsLoadingPlaylist(true);

        if (playlistId) {
          console.log('Detectada playlist mobile, buscando vídeos...');
          fetchPlaylistVideos(playlistId).then((fetchedVideos) => {
            if (fetchedVideos.length > 0) {
              setVideos(fetchedVideos);
              setCurrentVideoId(fetchedVideos[0].id);
              setIsLoadingVideoContent(true);
            } else {
              console.log('Playlist vazia, tentando vídeo único');
              if (videoId) {
                const singleVideo = {
                  id: videoId,
                  title: resource.title || (product ? 'Vídeo do Curso' : 'Vídeo'),
                  thumbnail: resource.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                  duration: 'N/A'
                };
                setVideos([singleVideo]);
                setCurrentVideoId(videoId);
                setIsLoadingVideoContent(true);
              }
            }
            setIsLoadingPlaylist(false);
          }).catch((error) => {
            console.error('Erro ao carregar playlist mobile:', error);
            if (videoId) {
              console.log('Fallback mobile: Tratando como vídeo único após erro na playlist');
              const singleVideo = {
                id: videoId,
                title: resource.title || (product ? 'Vídeo do Curso' : 'Vídeo'),
                thumbnail: resource.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                duration: 'N/A'
              };
              setVideos([singleVideo]);
              setCurrentVideoId(videoId);
              setIsLoadingVideoContent(true);
            }
            setIsLoadingPlaylist(false);
          });
        } else if (videoId) {
          console.log('Detectado vídeo único mobile');
          const singleVideo = {
            id: videoId,
            title: resource.title || (product ? 'Vídeo do Curso' : 'Vídeo'),
            thumbnail: resource.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            duration: 'N/A'
          };

          setVideos([singleVideo]);
          setCurrentVideoId(videoId);
          setIsLoadingVideoContent(true);
          setIsLoadingPlaylist(false);
        } else {
          setIsLoadingPlaylist(false);
        }
      }
    }
  }, [resource, product]);

  const handleVideoSelect = (videoId: string) => {
    // Se estiver mudando para um vídeo diferente
    if (videoId !== currentVideoId) {
      // Salvar progresso do vídeo atual antes de trocar
      if (saveProgress) {
        saveProgress();
      }

      // Destruir player atual antes de mudar
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {
          console.log('Error destroying player on video change:', e);
        }
      }

      // Reset estados
      setShowVideo(false);
      setIsLoadingVideoContent(true);

      // Pequeno delay para garantir cleanup completo
      setTimeout(() => {
        setCurrentVideoId(videoId);
      }, 50);
    }

    setShowPlaylistModal(false);
  };

  const currentVideo = videos.find(v => v.id === currentVideoId);

  // Get YouTube stats for current video
  const currentVideoYouTubeUrl = currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : 'pt-16';
  const youtubeStats = useYouTubeStats(currentVideoYouTubeUrl);

  // YouTube description query
  const { data: youtubeDescription, isLoading: isLoadingDescription } = useQuery({
    queryKey: ['youtube-description', currentVideoId],
    queryFn: async () => {
      if (!currentVideoId) return null;
      try {
        console.log('Buscando descrição do YouTube (mobile) para vídeo:', currentVideoId);
        const response = await fetch(`/api/youtube/video/${currentVideoId}`);
        if (!response.ok) {
          console.log('YouTube description fetch failed (mobile):', response.status);
          return null;
        }
        const data = await response.json();
        console.log('Descrição do YouTube recebida (mobile):', data.description ? 'SIM' : 'NÃO');
        return data.description || null;
      } catch (error) {
        console.log('YouTube description fetch error (mobile):', error);
        return null;
      }
    },
    enabled: !!currentVideoId,
    retry: false,
  });

  // Comments query
  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['comments', resourceId],
    queryFn: async () => {
      if (!resourceId) return [];
      try {
        const commentType = product ? 'product' : 'video';
        const response = await fetch(`/api/comments/${resourceId}?type=${commentType}`);
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch (error) {
        return [];
      }
    },
    enabled: !!resourceId,
    retry: false,
  });

  // Desativar skeleton quando TODOS os dados estiverem carregados (descrição, comentários E estatísticas do YouTube)
  useEffect(() => {
    // Aguarda carregamento completo de todos os elementos:
    // - Descrição carregada OU sem descrição disponível (permitir falha)
    // - Comentários carregados
    // - Estatísticas do YouTube carregadas
    // - Ter um vídeo atual e resource ID válidos
    const descriptionReady = !isLoadingDescription;
    const commentsReady = !isLoadingComments;
    const statsReady = !youtubeStats.loading;
    const hasRequiredIds = currentVideoId && resourceId;

    if (descriptionReady && commentsReady && statsReady && hasRequiredIds) {
      // Adiciona um pequeno delay para garantir que a descrição seja renderizada
      setTimeout(() => {
        setIsLoadingVideoContent(false);
      }, 100);
    }
  }, [isLoadingDescription, isLoadingComments, youtubeStats.loading, currentVideoId, resourceId]);

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(product ? { productId: resourceId } : { videoId: resourceId }),
          content
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao comentar');
      }
      return response.json();
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', resourceId] });
      toast({
        title: "Comentário adicionado!",
        description: "Seu comentário foi publicado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao comentar",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // YouTube like mutation
  const youtubeLikeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/youtube/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: currentVideoId, action: 'like' }),
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
      toast({ title: "Vídeo curtido!" });
    },
    onError: (error: any) => {
      if (error.message !== 'YouTube authorization required') {
        toast({ title: "Erro ao curtir vídeo", variant: "destructive" });
      }
    },
  });

  const handleComment = () => {
    if (!newComment.trim()) return;
    commentMutation.mutate(newComment);
  };

  const handleYouTubeLike = async () => {
    youtubeLikeMutation.mutate();
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setNeedsYouTubeAuth(false);
    toast({ title: "Autorização concluída com sucesso!" });
    setTimeout(() => {
      youtubeLikeMutation.mutate();
    }, 1000);
  };

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir comentário');
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['comments', resourceId] });
      setShowDeleteDialog(false);
      setDeleteCommentId(null);
      toast({
        title: "Comentário excluído!",
        description: "O comentário foi removido com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir comentário",
        description: error.message,
        variant: "destructive",
      });
    }
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
      default:
        return category;
    }
  };

  const handleBackClick = () => {
    navigate(product ? '/produtos' : '/videos');
  };

  // Determine if there are active banners to adjust padding (para produtos ou vídeos)
  const hasActiveBanners = resource?.isActive;


  if (isLoading || isLoadingPlaylist || videos.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header skeleton - Fixo */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-left flex-1 ml-4">
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <List className="h-5 w-5 text-primary" />
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

          {/* Playlist skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex space-x-3 p-3">
                <Skeleton className="w-20 h-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>

          {/* Comments skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 2 }).map((_, i) => (
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

  if ((hasError || !resource) && !isLoading) {
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
              <p className="text-sm text-muted-foreground">Conteúdo não encontrado</p>
            </div>
            <Play className="h-5 w-5 text-primary" />
          </div>
        </div>

        <div className="pt-16 px-4 py-8 text-center">
          <h2 className="text-xl font-bold mb-4">Conteúdo não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            ID: {resourceId || 'Não encontrado'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Verifique se o link está correto ou se o conteúdo ainda está disponível.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/produtos')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ver Produtos
            </Button>
            <Button onClick={() => navigate('/videos')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ver Vídeos
            </Button>
          </div>
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
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
              {resource?.title || 'Playlist'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {product ? 'Curso' : 'Vídeos exclusivos'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary hover:text-primary hover:bg-primary/10 animate-pulse"
            onClick={() => setShowPlaylistModal(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.1) 100%)',
              boxShadow: '0 0 10px rgba(236, 72, 153, 0.3)'
            }}
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {video ? (
        <PopupSystem
          trigger="page_specific"
          targetPage="video_specific"
          targetVideoId={resourceId}
        />
      ) : (
        <PopupSystem
          trigger="page_specific"
          targetPage="course_specific"
          targetCourseId={resourceId}
        />
      )}

      {/* Banner carousel para produtos/cursos específicos - começa logo após topbar */}
      {product && resourceId && (
        <div className="pt-16 w-full">
          <BannerCarousel page="course_specific" courseId={resourceId} />
        </div>
      )}

      {/* Banner carousel para vídeos específicos - começa logo após topbar */}
      {video && resourceId && (
        <div className="pt-16 w-full">
          <BannerCarousel page="video_specific" videoId={resourceId} />
        </div>
      )}

      {/* Content */}
      <div className={`px-4 py-6 space-y-6 ${hasActiveBanners ? '' : 'pt-20'}`}>
        {/* Video player */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          {!showVideo && currentVideoId && (
            <img
              src={currentVideo?.thumbnail || `https://img.youtube.com/vi/${currentVideoId}/maxresdefault.jpg`}
              alt={currentVideo?.title || 'Thumbnail'}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                // Tenta carregar uma imagem padrão se a miniatura falhar
                const target = e.target as HTMLImageElement;
                target.onerror = null; // Evita loop infinito
                target.src = `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`;
              }}
            />
          )}

          {!showVideo && currentVideoId && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer z-20 group"
              onClick={() => setShowVideo(true)}
            >
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors duration-200 group-hover:scale-110 transform">
                <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
              </div>
            </div>
          )}

          {showVideo && currentVideoId && (
            <div ref={playerContainerRef} className="w-full h-full"></div>
          )}
        </div>

        {/* Barra de Progresso do Vídeo Atual - Abaixo do Player */}
        {user && currentVideoId && videoProgressData && (() => {
          const currentProgress = videoProgressData.find(p => p.videoId === currentVideoId);
          const progress = currentProgress?.progressPercentage || 0;
          const completed = currentProgress?.isCompleted || false;
          
          return (progress > 0 || completed) ? (
            <div className="mt-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Progresso do vídeo atual
                </span>
                <span className="text-xs font-medium text-foreground flex items-center gap-1">
                  {completed && (
                    <Check className="w-3 h-3 text-green-500" />
                  )}
                  {completed ? '100' : progress}%
                </span>
              </div>
              <Progress 
                value={completed ? 100 : progress} 
                className="h-1.5"
              />
            </div>
          ) : null;
        })()}

        {/* Video info */}
        {isLoadingVideoContent ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-2" />
                <Skeleton className="h-4 w-4/6" />
              </CardContent>
            </Card>
          </div>
        ) : currentVideo && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">{currentVideo.title}</h2>

              <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm mb-4">
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
                  <span>há 2 dias</span>
                </div>
                {resource && resource.isExclusive && (
                  <Badge className="bg-purple-100 text-purple-700">Exclusivo</Badge>
                )}
                {product && product.category && (
                  <Badge variant="outline">{getCategoryLabel(product.category)}</Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mb-4">
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
              </div>

              {!isLoadingDescription && youtubeDescription && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">{youtubeDescription}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Comments section */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              {isLoadingVideoContent ? (
                <Skeleton className="w-5 h-5 rounded" />
              ) : (
                <MessageCircle className="w-5 h-5" />
              )}
              <h3 className="font-semibold">
                {isLoadingVideoContent ? (
                  <Skeleton className="h-5 w-32 inline-block" />
                ) : (
                  `Comentários (${comments.length})`
                )}
              </h3>
            </div>

            {isLoadingVideoContent ? (
              <div className="mb-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-16 w-full" />
                    <div className="flex justify-end mt-2">
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ) : user && (
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
              {isLoadingVideoContent ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))
              ) : comments.length === 0 ? (
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
        <AlertDialogContent className="mx-auto w-[calc(100vw-32px)] sm:max-w-sm rounded-2xl border-0 shadow-xl p-4">
          <AlertDialogHeader className="text-center space-y-2">
            <AlertDialogTitle>Excluir Comentário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center justify-center gap-2 mt-4 sm:space-y-0">
            <AlertDialogCancel className="flex-1 h-10 rounded-xl flex items-center justify-center border border-input bg-background text-foreground hover:bg-muted mt-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteComment}
              className="flex-1 h-10 rounded-xl flex items-center justify-center bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed mt-0"
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
        url={`${window.location.origin}/playlist/${resourceId}`}
        title={resource?.title || (product ? 'Curso' : 'Vídeo')}
        description={resource?.description}
      />

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        contentType={product ? "product" : "video"}
        contentTitle={resource?.title}
      />

      {/* Playlist Modal */}
      <Dialog open={showPlaylistModal} onOpenChange={setShowPlaylistModal}>
        <DialogContent className="mx-auto w-[calc(100vw-32px)] max-w-lg h-[80vh] p-0 rounded-2xl flex flex-col gap-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="p-4 pb-3 pt-6 flex-shrink-0 text-left">
            <DialogTitle className="text-lg font-semibold text-left">
              {resource?.title}
            </DialogTitle>
            {resource?.description && (
              <p className="text-sm text-muted-foreground mt-1 text-left">
                {resource.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1 text-left">
              {currentVideoId && videos.length > 0
                ? `${videos.findIndex(video => video.id === currentVideoId) + 1} de ${videos.length} vídeos`
                : `${videos.length} vídeos`
              }
            </p>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea key={showPlaylistModal ? 'open' : 'closed'} className="h-full px-4 pb-4">
              <div className="space-y-2">
                {videos.map((video, index) => (
                <Card
                  key={video.id}
                  className={`cursor-pointer transition-colors hover:bg-accent mx-2 my-1 ${
                    currentVideoId === video.id ? 'ring-2 ring-primary bg-accent' : ''
                  }`}
                  onClick={() => handleVideoSelect(video.id)}
                >
                  <CardContent className="p-2.5">
                    <div className="flex space-x-2.5">
                      <div className="relative w-16 h-10 flex-shrink-0 rounded overflow-hidden bg-muted">
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
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                          ) : (
                            <Play className="w-2.5 h-2.5 text-white" />
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
                        {/* Progress bar */}
                        {user && getVideoProgress(video.id) > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-muted-foreground">
                                {isVideoCompleted(video.id) ? '100' : getVideoProgress(video.id)}%
                              </span>
                              {isVideoCompleted(video.id) && (
                                <Check className="w-3 h-3 text-green-600" />
                              )}
                            </div>
                            <Progress
                              value={isVideoCompleted(video.id) ? 100 : getVideoProgress(video.id)}
                              className="h-1"
                              data-testid={`progress-video-${video.id}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <MobileBottomNav />
    </div>
  );
}