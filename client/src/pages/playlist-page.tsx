import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/sidebar';
import ShareModal from '@/components/share-modal';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Clock, List, X, Eye, Heart, ThumbsUp, Calendar, MessageCircle, Send, Trash2, Share2, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
import { MainContent } from '@/components/main-content';
import { PremiumUpgradeModal } from '@/components/premium-upgrade-modal';
import { useAccessControl } from '@/lib/premium-access';
import { PopupSystem } from '@/components/popup-system';
import { useVideoProgress } from '@/hooks/use-video-progress';
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

export default function PlaylistPage() {
  const [location, navigate] = useLocation();
  // Extract ID from URL - suporta /playlist/:id, /videos/playlist/:id, /produtos/playlist/:id
  const resourceId = location.includes('/playlist/') 
    ? location.split('/playlist/')[1]?.split('?')[0]
    : null;

  
  const isMobile = useIsMobile();
  const [isVideo, setIsVideo] = useState(false);

  const [videos, setVideos] = useState<PlaylistVideo[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const accessControl = useAccessControl();
  const [showPlaylist, setShowPlaylist] = useState(!isMobile);
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

  // Inicializar YouTube IFrame API
  useEffect(() => {
    // Carregar script da YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
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
        // Redireciona imediatamente para home com o nome do conteúdo
        const encodedTitle = encodeURIComponent(resource.title);
        const contentType = product ? 'product' : 'video';
        navigate(`/?showPremiumModal=true&contentType=${contentType}&contentTitle=${encodedTitle}`);
      }
    }
  }, [resource, accessControl, navigate, product]);

  // Debug logs para verificar o que está sendo carregado
  useEffect(() => {
    if (resourceId) {
      console.log('Resource ID:', resourceId);
      console.log('Product loaded:', product);
      console.log('Video loaded:', video);
      console.log('Resource:', resource);
    }
  }, [resourceId, product, video, resource]);

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
      console.log('Buscando playlist via API:', playlistId);

      const response = await fetch(`/api/youtube/playlist/${playlistId}`);
      if (!response.ok) {
        console.error('Playlist fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch playlist: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dados recebidos da API:', data);

      // A API retorna um objeto com { playlistTitle, playlistDescription, playlistThumbnail, videos }
      const videos = data.videos || [];

      if (!Array.isArray(videos)) {
        console.error('API retornou formato inválido:', data);
        return [];
      }

      // Converter para o formato esperado pelo componente
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
      // Para produtos usa fileUrl, para vídeos usa videoUrl
      const resourceUrl = product ? resource.fileUrl : (video ? resource.videoUrl : null);
      
      if (resourceUrl) {
        const playlistId = extractPlaylistId(resourceUrl);
        const videoId = extractVideoId(resourceUrl);

        console.log('Recurso carregado:', resource.title);
        console.log('URL:', resourceUrl);
        console.log('ID da playlist extraído:', playlistId);
        console.log('ID do vídeo extraído:', videoId);

        setIsLoadingPlaylist(true);

        if (playlistId) {
          // É uma playlist - buscar todos os vídeos
          console.log('Detectada playlist, buscando vídeos...');
          fetchPlaylistVideos(playlistId).then((fetchedVideos) => {
            console.log('Vídeos encontrados (playlist):', fetchedVideos);
            if (fetchedVideos.length > 0) {
              setVideos(fetchedVideos);
              setCurrentVideoId(fetchedVideos[0].id);
              setIsLoadingVideoContent(true);
            } else {
              console.log('Playlist vazia, tentando vídeo único');
              // Fallback para vídeo único se playlist estiver vazia
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
            console.error('Erro ao carregar playlist:', error);
            // Fallback para vídeo único em caso de erro
            if (videoId) {
              console.log('Fallback: Tratando como vídeo único após erro na playlist');
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
          // É um vídeo individual - criar uma "playlist" com um único vídeo
          console.log('Detectado vídeo único');
          const singleVideo = {
            id: videoId,
            title: resource.title || (product ? 'Vídeo do Curso' : 'Vídeo'),
            thumbnail: resource.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            duration: 'N/A'
          };

          setVideos([singleVideo]);
          setCurrentVideoId(videoId);
          // Ativar skeleton para aguardar carregamento dos dados do YouTube no carregamento inicial
          setIsLoadingVideoContent(true);
          setIsLoadingPlaylist(false);
          console.log('Vídeo único configurado:', singleVideo);
        } else {
          console.error('URL inválida - não é playlist nem vídeo válido');
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
    
    if (isMobile) {
      setShowPlaylist(false);
    }
  };

  const currentVideo = videos.find(v => v.id === currentVideoId);

  // Get YouTube stats for current video
  const currentVideoYouTubeUrl = currentVideoId ? `https://youtu.be/${currentVideoId}` : 'pt-16';
  const youtubeStats = useYouTubeStats(currentVideoYouTubeUrl);

  // YouTube description query
  const { data: youtubeDescription, isLoading: isLoadingDescription } = useQuery({
    queryKey: ['youtube-description', currentVideoId],
    queryFn: async () => {
      if (!currentVideoId) return null;
      try {
        console.log('Buscando descrição do YouTube para vídeo:', currentVideoId);
        const response = await fetch(`/api/youtube/video/${currentVideoId}`);
        if (!response.ok) {
          console.log('YouTube description fetch failed:', response.status);
          return null;
        }
        const data = await response.json();
        console.log('Descrição do YouTube recebida:', data.description ? 'SIM' : 'NÃO');
        return data.description || null;
      } catch (error) {
        console.log('YouTube description fetch error:', error);
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
          console.log('Comments fetch failed:', response.status);
          return [];
        }
        return response.json();
      } catch (error) {
        console.log('Comments fetch error:', error);
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
      // Invalidate and refetch comments automatically without page reload
      queryClient.invalidateQueries({ queryKey: ['comments', resourceId] });
      toast({
        title: "Comentário adicionado!",
        description: "Seu comentário foi publicado com sucesso",
      });
    },
    onError: (error: any) => {
      console.error('Error commenting:', error);
      toast({ 
        title: "Erro ao comentar", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // YouTube like mutation
  const youtubeLikeMutation = useMutation({
    mutationFn: async () => {
      console.log('🟡 Executando mutation para curtir, videoId:', currentVideoId);
      const response = await fetch('/api/youtube/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: currentVideoId, action: 'like' }),
        credentials: 'include'
      });

      console.log('🟡 Resposta da API:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('🟡 Dados do erro:', errorData);

        if (errorData.needsAuth) {
          console.log('🔵 Precisando de autenticação YouTube');
          // Precisa de autenticação
          const authResponse = await fetch('/api/auth/youtube', {
            credentials: 'include'
          });

          if (authResponse.ok) {
            const { authUrl } = await authResponse.json();
            console.log('🔵 URL de auth recebida:', authUrl);
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
      console.log('🟢 Vídeo curtido com sucesso!', data);
      setNeedsYouTubeAuth(false);
      toast({ title: "Vídeo curtido!" });
    },
    onError: (error: any) => {
      console.log('🔴 Erro na mutation:', error.message);
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
    console.log('🔴 Clicando no botão de curtir, currentVideoId:', currentVideoId);
    // Sempre tenta curtir primeiro
    youtubeLikeMutation.mutate();
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setNeedsYouTubeAuth(false);
    toast({ title: "Autorização concluída com sucesso!" });
    // Tenta curtir novamente após autorização
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
      // Invalidate and refetch comments first
      await queryClient.invalidateQueries({ queryKey: ['comments', resourceId] });

      // Only close modal and show success after refetch
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
        variant: "destructive" 
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

  if (isLoading || isLoadingPlaylist || videos.length === 0) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        
        <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
          <div className="container mx-auto px-6 py-8">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-10 w-48" />
              {isMobile && <Skeleton className="h-8 w-20" />}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Player skeleton */}
              <div className="lg:col-span-2">
                {/* Video player skeleton */}
                <Skeleton className="w-full aspect-video rounded-lg mb-6" />

                {/* Course info skeleton */}
                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <div className="flex items-center gap-2 mb-4">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>

                  {/* Comments skeleton */}
                  <div className="space-y-4 pt-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className="space-y-3 p-4">
                        <div className="flex items-start space-x-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Playlist skeleton - Desktop only */}
              {!isMobile && (
                <div className="lg:col-span-1">
                  <div className="space-y-4">
                    <div className="p-4">
                      <Skeleton className="h-6 w-40 mb-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>

                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="flex space-x-3 p-3">
                          <Skeleton className="w-20 h-12 rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <Skeleton className="h-3 w-4" />
                              <Skeleton className="h-3 w-10" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Playlist skeleton */}
            {isMobile && (
              <div className="mt-6">
                <div className="space-y-4">
                  <div className="p-4">
                    <Skeleton className="h-6 w-32 mb-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex space-x-3 p-2">
                        <Skeleton className="w-14 h-9 rounded" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if ((hasError || !resource) && !isLoading) {
    console.log('Resource not found:', { resourceId, product, video, hasError });
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MainContent>
          <div className="container mx-auto px-6 py-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Conteúdo não encontrado</h1>
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
        </MainContent>
      </div>
    );
  }

  

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
                            if (iframeUrl && (iframeUrl.includes('/course') || iframeUrl.includes('/videos'))) {
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

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
        {/* Added PopupSystem for course-specific popups */}
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
        <div className="container mx-auto px-6 py-8">
          {/* Banner carousel for course-specific banners */}
          {product && (
            <div className="mb-6">
              <BannerCarousel page="course_specific" courseId={resourceId} />
            </div>
          )}
          
          {/* Banner carousel for video-specific playlists - usar resourceId da playlist */}
          {video && resourceId && (
            <div className="mb-6">
              <BannerCarousel page="video_specific" videoId={resourceId} />
            </div>
          )}
          
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(product ? '/produtos' : '/videos')}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para {product ? 'produtos' : 'vídeos'}
            </Button>

            {isMobile && videos.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPlaylist(!showPlaylist)}
              >
                {showPlaylist ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}
                {showPlaylist ? '' : 'Playlist'}
              </Button>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Player Principal */}
            <div className="lg:col-span-2">
              {/* Video player */}
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-6">
                {currentVideo?.thumbnail && !showVideo && (
                  <img
                    src={currentVideo.thumbnail}
                    alt={currentVideo?.title || 'Thumbnail'}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {/* Play button overlay */}
                {!showVideo && currentVideoId && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer z-20 group"
                    onClick={() => setShowVideo(true)}
                  >
                    <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors duration-200 group-hover:scale-110 transform">
                      <Play className="w-8 h-8 text-white ml-1" fill="white" />
                    </div>
                  </div>
                )}

                {/* YouTube player */}
                {showVideo && currentVideoId && (
                  <div id="youtube-player-container" ref={playerContainerRef} className="absolute inset-0 w-full h-full z-10" />
                )}
              </div>

              {/* Video info - igual ao video-watch-page */}
              <div className="space-y-4 mb-8">
                {isLoadingVideoContent ? (
                  /* Skeleton para informações do vídeo */
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                    <Card>
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-5/6 mb-2" />
                        <Skeleton className="h-4 w-4/6" />
                      </CardContent>
                    </Card>
                  </div>
                ) : currentVideo && (
                  <div>
                    {/* Título do vídeo */}
                    <h1 className="text-2xl font-bold text-foreground mb-2">{currentVideo.title}</h1>

                    {/* Linha com visualizações, tempo, badges */}
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-4">
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

                    {/* Botões de ação */}
                    <div className="flex items-center gap-4 mb-4">
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

                    {/* Descrição do YouTube em card */}
                    {!isLoadingDescription && youtubeDescription && (
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-muted-foreground whitespace-pre-wrap">{youtubeDescription}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* Comments section */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    {isLoadingVideoContent ? (
                      <Skeleton className="w-5 h-5 rounded" />
                    ) : (
                      <MessageCircle className="w-5 h-5" />
                    )}
                    <h3 className="text-lg font-semibold">
                      {isLoadingVideoContent ? (
                        <Skeleton className="h-6 w-32 inline-block" />
                      ) : (
                        `Comentários (${comments.length})`
                      )}
                    </h3>
                  </div>

                  {isLoadingVideoContent ? (
                    /* Skeleton para área de comentários */
                    <div className="mb-8 space-y-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-20 w-full" />
                          <div className="flex justify-end mt-2">
                            <Skeleton className="h-8 w-20" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : user && (
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
                    {isLoadingVideoContent ? (
                      /* Skeleton para lista de comentários */
                      Array.from({ length: 3 }).map((_, index) => (
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

            {/* Playlist Sidebar - Desktop */}
            {!isMobile && videos.length > 0 && (
              <div className="lg:col-span-1">
                <Card>
                  <div className="p-4 border-b border-border text-left">
                    <h3 className="font-semibold text-foreground text-left">{resource?.title || 'Playlist'}</h3>
                    {resource?.description && (
                      <p className="text-sm text-muted-foreground mt-2 text-left">
                        {resource.description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1 text-left">
                      {currentVideoId && videos.length > 0 
                        ? `${videos.findIndex(video => video.id === currentVideoId) + 1} de ${videos.length} vídeos`
                        : `${videos.length} vídeos`
                      }
                    </p>
                  </div>

                  <ScrollArea className="h-[600px]">
                    <div className="p-2">
                      {videos.map((video, index) => {
                        const progress = getVideoProgress(video.id);
                        const completed = isVideoCompleted(video.id);
                        
                        return (
                          <Card 
                            key={video.id}
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
                        );
                      })}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Playlist Overlay */}
        {isMobile && showPlaylist && videos.length > 0 && (
          <div className="fixed inset-0 bg-background z-50">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-left">{resource?.title || 'Playlist'}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlaylist(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {resource?.description && (
                  <p className="text-sm text-muted-foreground mt-2 text-left">
                    {resource.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1 text-left">
                  {currentVideoId && videos.length > 0 
                    ? `${videos.findIndex(video => video.id === currentVideoId) + 1} de ${videos.length} vídeos`
                    : `${videos.length} vídeos`
                  }
                </p>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2">
                  {videos.map((video, index) => (
                    <Card 
                      key={video.id}
                      className={`mb-2 cursor-pointer transition-colors hover:bg-accent ${
                        currentVideoId === video.id ? 'ring-2 ring-primary bg-accent' : ''
                      }`}
                      onClick={() => handleVideoSelect(video.id)}
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
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
    </div>
  );
}