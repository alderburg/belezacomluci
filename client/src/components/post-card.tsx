
import { Post, User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Crown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface PostWithUser extends Post {
  user: Pick<User, 'id' | 'name' | 'avatar' | 'isAdmin'>;
}

interface PostCardProps {
  post: PostWithUser;
}

export default function PostCard({ post }: PostCardProps) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);

  const likeMutation = useMutation({
    mutationFn: async () => {
      // This would be implemented when like functionality is added to the backend
      await apiRequest("POST", `/api/posts/${post.id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao curtir postagem",
        variant: "destructive",
      });
    },
  });

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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

  const formatTimeAgo = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { 
      locale: ptBR, 
      addSuffix: true 
    });
  };

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
    
    toast({
      title: newLiked ? "Post curtido! ❤️" : "Curtida removida",
      description: newLiked ? "Você curtiu esta postagem" : "Você descurtiu esta postagem",
    });
  };

  const handleComment = () => {
    setShowComments(!showComments);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copiado!",
      description: "Link da postagem copiado para a área de transferência",
    });
  };

  // Check if this is a challenge/announcement post
  const isChallenge = post.content.toLowerCase().includes('desafio') || 
                     post.content.includes('🎯') || 
                     post.content.includes('🏆');

  return (
    <Card className="overflow-hidden border-none shadow-sm" data-testid={`post-card-${post.id}`}>
      <CardContent className="p-0">
        {/* Header do Post */}
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.user.avatar} alt={post.user.name} />
              <AvatarFallback 
                className={post.user.isAdmin ? "gradient-primary text-white" : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"}
              >
                {post.user.isAdmin ? <Crown className="w-5 h-5" /> : getUserInitials(post.user.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-sm text-foreground" data-testid={`post-author-${post.id}`}>
                  {post.user.name}
                </h4>
                {post.user.isAdmin && (
                  <Badge className="bg-accent/10 text-accent text-xs px-2 py-0">Criadora</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground" data-testid={`post-time-${post.id}`}>
                {formatTimeAgo(post.createdAt!)}
              </span>
            </div>
          </div>
        </div>

        {/* Mídia do Post (Imagem ou Vídeo) */}
        {post.imageUrl && (
          <div className="w-full">
            {isYouTubeVideo(post.imageUrl) ? (
              <div className="relative">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeVideoId(post.imageUrl)}`}
                  title={`Vídeo: ${post.content.substring(0, 50)}...`}
                  className="w-full aspect-video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  data-testid={`post-video-${post.id}`}
                ></iframe>
              </div>
            ) : (
              <img 
                src={post.imageUrl} 
                alt="Post image" 
                className="w-full h-auto object-cover"
                style={{ maxHeight: '600px' }}
                data-testid={`post-image-${post.id}`}
              />
            )}
          </div>
        )}

        {/* Ações do Post */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`p-0 h-auto hover:bg-transparent ${liked ? 'text-red-500' : 'text-foreground'}`}
                data-testid={`button-like-post-${post.id}`}
              >
                <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComment}
                className="p-0 h-auto hover:bg-transparent text-foreground"
                data-testid={`button-comment-post-${post.id}`}
              >
                <MessageCircle className="w-6 h-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="p-0 h-auto hover:bg-transparent text-foreground"
                data-testid={`button-share-post-${post.id}`}
              >
                <Share2 className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Contador de Curtidas */}
          {likesCount > 0 && (
            <p className="font-semibold text-sm mb-2">
              {likesCount} {likesCount === 1 ? 'curtida' : 'curtidas'}
            </p>
          )}

          {/* Conteúdo do Post */}
          <div className="mb-2">
            {/* Challenge/Special Post */}
            {isChallenge && post.user.isAdmin ? (
              <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-5 h-5 gradient-gold rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">🏆</span>
                  </div>
                  <h5 className="font-semibold text-sm text-foreground">Desafio da Semana</h5>
                </div>
                <p className="text-sm text-foreground mb-2" data-testid={`post-content-${post.id}`}>
                  <span className="font-semibold mr-2">{post.user.name}</span>
                  {post.content}
                </p>
                <p className="text-xs text-muted-foreground">
                  Participe e concorra a prêmios incríveis!
                </p>
              </div>
            ) : (
              <p className="text-sm text-foreground" data-testid={`post-content-${post.id}`}>
                <span className="font-semibold mr-2">{post.user.name}</span>
                {post.content}
              </p>
            )}
          </div>

          {/* Ver Comentários */}
          {showComments && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Sistema de comentários em desenvolvimento...
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
