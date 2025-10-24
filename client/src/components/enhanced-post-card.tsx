import React, { useState, useRef, useEffect } from 'react';
import { Post, User } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Crown, 
  Send, 
  MoreHorizontal,
  Bookmark,
  Flag,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TimestampDisplay from './timestamp-display';
import { useAuth } from '@/hooks/use-auth';
import { useDataSync } from '@/hooks/use-data-sync';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ShareModal from "@/components/share-modal";

interface PostWithUser extends Post {
  user: Pick<User, 'id' | 'name' | 'avatar' | 'isAdmin'>;
  taggedUsers?: Array<Pick<User, 'id' | 'name' | 'avatar'>>;
  liked?: boolean;
  commentsCount?: number;
  comments?: any[];
  commentCount?: number; // Adicionado para a correção
}

interface EnhancedPostCardProps {
  post: PostWithUser;
}

export default function EnhancedPostCard({ post }: EnhancedPostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected } = useDataSync(); // WebSocket global para sync
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Função para verificar se é um link do YouTube
  const isYouTubeVideo = (url: string): boolean => {
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#\?]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/
    ];
    
    return youtubePatterns.some(pattern => pattern.test(url));
  };

  // Função para extrair o ID do vídeo do YouTube
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#\?]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Remove qualquer parâmetro adicional do ID
        let videoId = match[1];
        if (videoId.includes('?')) {
          videoId = videoId.split('?')[0];
        }
        return videoId;
      }
    }
    return null;
  };

  const [liked, setLiked] = useState(post.liked || false);
  const [saved, setSaved] = useState(false);

  // Query para verificar se o usuário salvou este post
  const { data: saveStatus } = useQuery({
    queryKey: [`/api/posts/${post.id}/save-status`],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/save-status`, {
        credentials: 'include'
      });
      return response.json();
    },
    enabled: !!user
  });

  // Atualizar estado de salvo baseado na query
  useEffect(() => {
    if (saveStatus?.saved !== undefined) {
      setSaved(saveStatus.saved);
    }
  }, [saveStatus]);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [commentsCount, setCommentsCount] = useState(0); // Será atualizado com os dados dos comentários
  const [sharesCount, setSharesCount] = useState(post.shares || 0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>(post.comments || []);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Query para verificar se o usuário já curtiu esta postagem
  const { data: likeStatus } = useQuery({
    queryKey: [`/api/posts/${post.id}/like-status`],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/like-status`, {
        credentials: 'include'
      });
      return response.json();
    },
    enabled: !!user
  });

  // Atualizar estado de curtida baseado na query
  useEffect(() => {
    if (likeStatus?.liked !== undefined) {
      setLiked(likeStatus.liked);
    }
  }, [likeStatus]);

  // Query para carregar comentários, habilitada apenas quando showComments é true
  const { data: commentsData, isLoading: isLoadingComments } = useQuery({
    queryKey: [`/api/posts/${post.id}/comments`],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: showComments, // Só executa quando showComments for true
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });

  // Atualizar comentários e contagem quando os dados chegam
  useEffect(() => {
    if (commentsData && Array.isArray(commentsData)) {
      setComments(commentsData);
      setCommentsCount(commentsData.length);
      
      // Carregar status de curtida para cada comentário
      commentsData.forEach(async (comment: any) => {
        if (user) {
          try {
            const response = await fetch(`/api/comments/${comment.id}/like-status`, {
              credentials: 'include'
            });
            if (response.ok) {
              const { liked } = await response.json();
              setCommentLikes(prev => ({ ...prev, [comment.id]: liked }));
            }
          } catch (error) {
            console.error('Error fetching like status:', error);
          }
        }
      });
    }
  }, [commentsData, user]);

  // Escutar atualizações do WebSocket para curtidas e respostas de comentários
  useEffect(() => {
    const handleDataUpdate = (event: CustomEvent) => {
      try {
        const { dataType, action, data } = event.detail;
        
        if (dataType === 'posts') {
          // Atualizar curtidas de comentário
          if (action === 'comment_like' && data?.commentId) {
            setComments(prev => prev.map(c => 
              c.id === data.commentId 
                ? { ...c, likesCount: data.likesCount }
                : c
            ));
            
            // Atualizar estado de curtida se for do usuário atual
            if (data.liked !== undefined) {
              setCommentLikes(prev => ({ ...prev, [data.commentId]: data.liked }));
            }
          }
          
          // Atualizar respostas de comentário
          if (action === 'comment_reply' && data?.commentId && data.reply) {
            setCommentReplies(prev => ({
              ...prev,
              [data.commentId]: [data.reply, ...(prev[data.commentId] || [])]
            }));
            
            setComments(prev => prev.map(c => 
              c.id === data.commentId 
                ? { ...c, repliesCount: data.repliesCount || (c.repliesCount || 0) + 1 }
                : c
            ));
          }
          
          // Atualizar comentário adicionado
          if (action === 'comment_added' && data?.comment) {
            setComments(prev => [data.comment, ...prev]);
            setCommentsCount(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    // Escutar eventos de atualização de dados
    window.addEventListener('data_update', handleDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('data_update', handleDataUpdate as EventListener);
    };
  }, []);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/posts/${post.id}/like`);
      return response.json();
    },
    onSuccess: (data) => {
      // Atualiza com dados reais do servidor
      if (data?.liked !== undefined && data?.likesCount !== undefined) {
        setLiked(data.liked);
        setLikesCount(data.likesCount);
      }
      // Invalidar queries para sincronização global
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });

      // Log para debug do WebSocket
      if (isConnected) {
        console.log('WebSocket conectado - dados sincronizados globalmente');
      }
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Falha ao curtir postagem',
        variant: 'destructive',
      });
    },
  });

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTimeAgo = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { 
      locale: ptBR, 
      addSuffix: true 
    });
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para curtir postagens",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update - atualiza a interface imediatamente
    const previousLiked = liked;
    const previousLikesCount = likesCount;
    const newLiked = !liked;
    
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Falha ao curtir postagem');
      }

      const result = await response.json();

      // Confirma com dados reais do servidor
      setLiked(result.liked);
      setLikesCount(result.likesCount);

      // Track activity if liked (not unliked)
      if (result.liked) {
        fetch('/api/user-activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'liked_post',
            description: 'Curtiu uma postagem da comunidade',
            metadata: {
              postId: post.id,
              postAuthor: post.user.name
            }
          })
        }).catch(console.error);
      }

      // Invalidate queries for global sync
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/like-status`] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });

      toast({
        title: result.liked ? "❤️ Curtiu!" : "Curtida removida",
        description: result.liked ? "Você curtiu esta postagem" : "Você descurtiu esta postagem",
      });

    } catch (error) {
      console.error('Erro ao curtir:', error);
      toast({
        title: "Erro",
        description: "Falha ao curtir postagem",
        variant: "destructive",
      });
    }
  };

  const handleComment = () => {
    setShowComments(!showComments);
    if (!showComments) {
      setTimeout(() => commentInputRef.current?.focus(), 100);
    }
  };

  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [commentReplies, setCommentReplies] = useState<Record<string, any[]>>({});
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});

  const submitComment = async () => {
    if (!newComment.trim() || !user || isSubmittingComment) return;

    setIsSubmittingComment(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newComment.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar comentário');
      }

      const commentData = await response.json();

      // Registrar atividade de comentário
      fetch('/api/user-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'commented_post',
          description: `Comentou em uma postagem da comunidade`,
          metadata: {
            postId: post.id,
            postAuthor: post.user.name,
            commentPreview: newComment.trim().substring(0, 50) + (newComment.trim().length > 50 ? '...' : '')
          }
        })
      }).catch(console.error);

      setNewComment("");
      setComments(prev => [commentData, ...prev]);
      setCommentsCount(prev => prev + 1);

      // Invalidate comments query to refresh
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });


      toast({
        title: "Comentário enviado! 💬",
        description: "Seu comentário foi publicado",
      });
    } catch (error) {
      console.error('Erro ao comentar:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar comentário",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/comunidade#post-${post.id}`;
    setShareModalOpen(true);
    setShareUrl(postUrl);

    // Incrementar contador de compartilhamentos no backend
    if (user) {
      try {
        const response = await fetch(`/api/posts/${post.id}/share`, {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          setSharesCount(result.sharesCount);

          toast({
            title: "Postagem compartilhada! 📤",
            description: "Obrigada por compartilhar conteúdo da nossa comunidade!",
          });
        }

        // Registrar atividade de compartilhamento
        fetch('/api/user-activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'shared_post',
            description: `Compartilhou uma postagem da comunidade`,
            metadata: {
              postId: post.id,
              postAuthor: post.user.name
            }
          })
        }).catch(console.error);
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para salvar postagens",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    const previousSaved = saved;
    setSaved(!saved);

    try {
      const response = await fetch(`/api/posts/${post.id}/save`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar postagem');
      }

      const result = await response.json();

      // Confirma com dados reais do servidor
      setSaved(result.saved);

      // Invalidate queries for global sync
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/save-status`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-posts'] });

      toast({
        title: result.saved ? '🔖 Postagem salva!' : 'Postagem removida dos salvos',
        description: result.saved ? 'Adicionada aos seus salvos' : 'Removida da sua lista',
      });

    } catch (error) {
      // Rollback on error
      setSaved(previousSaved);
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar postagem",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/comunidade#post-${post.id}`;
    await navigator.clipboard.writeText(postUrl);
    toast({
      title: '🔗 Link copiado!',
      description: 'Link da postagem copiado',
    });
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para curtir comentários",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    const previousLiked = commentLikes[commentId] || false;
    setCommentLikes(prev => ({ ...prev, [commentId]: !previousLiked }));

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to like comment');

      const result = await response.json();
      
      setCommentLikes(prev => ({ ...prev, [commentId]: result.liked }));
      
      // Update comment in list with actual count from server
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { ...c, likesCount: result.likesCount }
          : c
      ));

      toast({
        title: result.liked ? "❤️ Curtiu!" : "Curtida removida",
        description: result.liked ? "Você curtiu este comentário" : "Você descurtiu este comentário",
      });
    } catch (error) {
      // Rollback on error
      setCommentLikes(prev => ({ ...prev, [commentId]: previousLiked }));
      console.error('Error liking comment:', error);
      toast({
        title: "Erro",
        description: "Falha ao curtir comentário",
        variant: "destructive",
      });
    }
  };

  const handleReplyToComment = async (commentId: string) => {
    setReplyingTo(commentId);
    setReplyContent('');
    
    // Carregar respostas se ainda não foram carregadas
    if (!commentReplies[commentId]) {
      try {
        const response = await fetch(`/api/comments/${commentId}/replies`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const replies = await response.json();
          setCommentReplies(prev => ({ ...prev, [commentId]: replies }));
        }
      } catch (error) {
        console.error('Error fetching replies:', error);
      }
    }
    
    // Sempre mostrar as respostas ao clicar em responder
    setShowReplies(prev => ({ ...prev, [commentId]: true }));
  };

  const submitReply = async (commentId: string) => {
    if (!replyContent.trim() || !user) return;

    try {
      const response = await fetch(`/api/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: replyContent.trim() })
      });

      if (!response.ok) throw new Error('Failed to reply');

      const reply = await response.json();
      
      setCommentReplies(prev => ({
        ...prev,
        [commentId]: [reply, ...(prev[commentId] || [])]
      }));
      
      // Atualizar o comentário com o contador atualizado
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { ...c, repliesCount: (c.repliesCount || 0) + 1 }
          : c
      ));

      setReplyContent('');
      setReplyingTo(null);
      // Manter respostas visíveis após enviar
      setShowReplies(prev => ({ ...prev, [commentId]: true }));

      // Invalidar query para recarregar comentários com contadores atualizados
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });

      toast({
        title: "Resposta enviada! 💬",
        description: "Sua resposta foi publicada",
      });
    } catch (error) {
      console.error('Error replying to comment:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar resposta",
        variant: "destructive",
      });
    }
  };

  

  const isChallenge = post.content.toLowerCase().includes('desafio') || 
                     post.content.includes('🎯') || 
                     post.content.includes('🏆');

  return (
    <Card className="overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-0">
        {/* Header do Post */}
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="flex items-center space-x-3">
            {/* Avatares sobrepostos quando há marcação */}
            {post.taggedUsers && post.taggedUsers.length > 0 ? (
              <div className="flex items-center -space-x-2">
                <Avatar className="w-12 h-12 ring-2 ring-card z-10">
                  <AvatarImage 
                    src={post.user.avatar || undefined} 
                    alt={post.user.name} 
                    className="object-cover"
                  />
                  <AvatarFallback 
                    className={post.user.isAdmin ? "bg-gradient-to-br from-primary to-accent text-white" : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"}
                  >
                    {post.user.isAdmin ? <Crown className="w-6 h-6" /> : getUserInitials(post.user.name)}
                  </AvatarFallback>
                </Avatar>
                {post.taggedUsers.map((taggedUser, index) => (
                  <Avatar key={taggedUser.id} className="w-12 h-12 ring-2 ring-card" style={{ zIndex: 9 - index }}>
                    <AvatarImage 
                      src={taggedUser.avatar || undefined} 
                      alt={taggedUser.name} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                      {getUserInitials(taggedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <div className="relative">
                <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                  <AvatarImage 
                    src={post.user.avatar || undefined} 
                    alt={post.user.name} 
                    className="object-cover"
                  />
                  <AvatarFallback 
                    className={post.user.isAdmin ? "bg-gradient-to-br from-primary to-accent text-white" : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"}
                  >
                    {post.user.isAdmin ? <Crown className="w-6 h-6" /> : getUserInitials(post.user.name)}
                  </AvatarFallback>
                </Avatar>
                {post.user.isAdmin && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center border-2 border-card">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-semibold">
                  <span className="text-foreground hover:text-primary transition-colors cursor-pointer">
                    {post.user.name}
                  </span>
                  {post.taggedUsers && post.taggedUsers.length > 0 && (
                    <span className="font-normal text-muted-foreground">
                      {' e '}
                      {post.taggedUsers.map((taggedUser, index) => (
                        <React.Fragment key={taggedUser.id}>
                          <span className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors">
                            {taggedUser.name}
                          </span>
                          {index < post.taggedUsers.length - 1 && <span>, </span>}
                        </React.Fragment>
                      ))}
                    </span>
                  )}
                </h4>
                {/* Badge de criadora apenas quando NÃO há marcação */}
                {post.user.isAdmin && (!post.taggedUsers || post.taggedUsers.length === 0) && (
                  <Badge className="bg-gradient-to-r from-accent to-primary text-white text-xs px-2 py-0.5 shadow-sm">
                    ✨ Criadora
                  </Badge>
                )}
              </div>
              
              <TimestampDisplay 
                date={post.createdAt!} 
                variant="default"
              />
            </div>
          </div>
        </div>

        {/* Conteúdo do Post */}
        <div className="px-4">
          {isChallenge && post.user.isAdmin ? (
            <div className="bg-gradient-to-r from-accent/20 to-primary/20 rounded-xl p-4 mb-0 border border-primary/20">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🏆</span>
                </div>
                <h5 className="font-bold text-primary">Desafio da Semana</h5>
              </div>
              <p className="text-foreground leading-relaxed">
                {post.content}
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                ✨ Participe e concorra a prêmios incríveis!
              </p>
            </div>
          ) : (
            <p className="text-foreground leading-relaxed mb-0">
              {post.content}
            </p>
          )}
        </div>

        {/* Mídia do Post (Imagem ou Vídeo) */}
        {post.imageUrl && (
          <div className="w-full mt-3">
            {isYouTubeVideo(post.imageUrl) ? (
              <div className="relative">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeVideoId(post.imageUrl)}`}
                  title={`Vídeo: ${post.content.substring(0, 50)}...`}
                  className="w-full aspect-video rounded-lg"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <img 
                src={post.imageUrl} 
                alt="Post image" 
                className="w-full h-auto object-cover cursor-pointer hover:brightness-95 transition-all rounded-lg"
                style={{ maxHeight: '600px' }}
                onClick={() => window.open(post.imageUrl, '_blank')}
              />
            )}
          </div>
        )}

        {/* Estatísticas */}
        <div className="px-4 py-2 border-b border-border/50 mt-3">
          {/* Contador de Curtidas, Comentários e Compartilhamentos */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
            {likesCount > 0 && (
              <span className="font-medium">
                {likesCount} {likesCount === 1 ? 'curtida' : 'curtidas'}
              </span>
            )}
            {(commentsCount || post.commentCount || 0) > 0 && (
              <span className="font-medium">
                {commentsCount || post.commentCount || 0} {(commentsCount || post.commentCount || 0) === 1 ? 'comentário' : 'comentários'}
              </span>
            )}
            {sharesCount > 0 && (
              <span className="font-medium">
                {sharesCount} {sharesCount === 1 ? 'compartilhamento' : 'compartilhamentos'}
              </span>
            )}
          </div>
        </div>

        {/* Ações do Post */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`p-0 h-auto hover:bg-transparent group ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'} transition-all duration-300`}
                data-like-button={post.id}
              >
                <Heart className={`w-6 h-6 transition-all duration-300 group-hover:scale-110 ${liked ? 'fill-current animate-pulse' : ''}`} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleComment}
                className="p-0 h-auto hover:bg-transparent group text-muted-foreground hover:text-primary transition-all duration-300"
              >
                <MessageCircle className="w-6 h-6 transition-all duration-300 group-hover:scale-110" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="p-0 h-auto hover:bg-transparent group text-muted-foreground hover:text-accent transition-all duration-300"
              >
                <Share2 className="w-6 h-6 transition-all duration-300 group-hover:scale-110" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className={`p-0 h-auto hover:bg-transparent group transition-all duration-300 ${saved ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}
            >
              <Bookmark className={`w-6 h-6 transition-all duration-300 group-hover:scale-110 ${saved ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Seção de Comentários */}
        {showComments && (
          <div className="border-t border-border pt-4 space-y-4">
            {/* Form para novo comentário */}
            {user && (
              <div className="flex items-start space-x-3 px-4">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage 
                    src={user.avatar || undefined} 
                    alt={user.name} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs">
                    {getUserInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    ref={commentInputRef}
                    placeholder="Escreva um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] resize-none border border-border/50 bg-background rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        submitComment();
                      }
                    }}
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={submitComment} 
                      disabled={!newComment.trim() || isSubmittingComment}
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isSubmittingComment ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Enviando...</span>
                        </div>
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-1" />
                          Enviar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de comentários */}
            <div className="px-4">
              {isLoadingComments && (
                <div className="flex justify-center items-center h-24">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              {!isLoadingComments && (comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div key={comment.id} className="py-3">
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage 
                          src={comment.user?.avatar || undefined} 
                          alt={comment.user?.name || 'Usuário'} 
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs">
                          {getUserInitials(comment.user?.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {comment.user?.name || 'Usuário Anônimo'}
                            </span>
                            {comment.user?.isAdmin && (
                              <Badge className="bg-accent/10 text-accent text-xs px-1 py-0">Admin</Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground">{comment.content}</p>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleCommentLike(comment.id)}
                              className={`h-6 px-0 hover:bg-transparent transition-all duration-300 ${commentLikes[comment.id] ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                            >
                              <Heart className={`w-3 h-3 transition-all duration-300 ${commentLikes[comment.id] ? 'fill-current animate-pulse' : ''}`} />
                            </Button>
                            {comment.likesCount > 0 && (
                              <span className="text-xs text-muted-foreground">{comment.likesCount}</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleReplyToComment(comment.id)}
                              className="h-6 px-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-all duration-300"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </Button>
                            {comment.repliesCount > 0 && (
                              <span className="text-xs text-muted-foreground">{comment.repliesCount}</span>
                            )}
                          </div>
                        </div>

                        {/* Reply input */}
                        {replyingTo === comment.id && (
                          <div className="mt-3 flex items-start space-x-2">
                            <Avatar className="w-6 h-6 flex-shrink-0">
                              <AvatarImage src={user?.avatar || undefined} className="object-cover" />
                              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs">
                                {getUserInitials(user?.name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <Textarea
                                placeholder="Escreva uma resposta..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                className="min-h-[60px] text-sm"
                              />
                              <div className="flex justify-end space-x-2 mt-2">
                                <Button 
                                  onClick={() => setReplyingTo(null)} 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-7 text-xs"
                                >
                                  Cancelar
                                </Button>
                                <Button 
                                  onClick={() => submitReply(comment.id)} 
                                  disabled={!replyContent.trim()}
                                  size="sm"
                                  className="h-7 text-xs"
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  Responder
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Replies list */}
                        {showReplies[comment.id] && commentReplies[comment.id] && (
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-muted">
                            {commentReplies[comment.id].map((reply: any) => (
                              <div key={reply.id} className="flex items-start space-x-2">
                                <Avatar className="w-6 h-6 flex-shrink-0">
                                  <AvatarImage 
                                    src={reply.user?.avatar || undefined} 
                                    alt={reply.user?.name} 
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="bg-gradient-to-br from-green-400 to-teal-500 text-white text-xs">
                                    {getUserInitials(reply.user?.name || 'U')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="bg-muted/50 rounded-lg px-2 py-1.5">
                                    <span className="text-xs font-medium text-foreground">
                                      {reply.user?.name}
                                    </span>
                                    <p className="text-xs text-foreground mt-0.5">{reply.content}</p>
                                  </div>
                                  <span className="text-xs text-muted-foreground mt-1 inline-block">
                                    {formatTimeAgo(reply.createdAt)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Seja o primeiro a comentar! 💬</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Modal de Compartilhamento */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        url={shareUrl}
        title={`Postagem de ${post.user.name}`}
        description={post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content}
        onShare={() => {
          // Só contabiliza uma vez por compartilhamento quando o usuário efetivamente compartilha
          console.log('Compartilhamento efetivado!');
        }}
      />
    </Card>
  );
}