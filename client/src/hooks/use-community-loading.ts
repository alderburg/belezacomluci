
import { useQuery, useIsFetching, useQueries } from '@tanstack/react-query';
import { Post, User } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useRef, useEffect } from 'react';

interface PostWithUser extends Post {
  user: Pick<User, 'id' | 'name' | 'avatar' | 'isAdmin'>;
  comments?: CommentWithUser[];
  commentCount?: number;
  liked?: boolean;
}

interface CommentWithUser {
  id: string;
  content: string;
  createdAt: Date;
  user: Pick<User, 'id' | 'name' | 'avatar'>;
}

export function useCommunityLoading() {
  const { user } = useAuth();
  const hasInitialized = useRef(false);
  
  // Query principal dos posts
  const { 
    data: posts, 
    isLoading: postsLoading, 
    isInitialLoading,
    error: postsError 
  } = useQuery<PostWithUser[]>({
    queryKey: ["/api/posts"],
    queryFn: async () => {
      const response = await fetch('/api/posts', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
    staleTime: 30000
  });

  // Precarregar like-status para todos os posts visíveis
  const likeStatusQueries = useQueries({
    queries: (posts || []).map(post => ({
      queryKey: [`/api/posts/${post.id}/like-status`],
      queryFn: async () => {
        const response = await fetch(`/api/posts/${post.id}/like-status`, {
          credentials: 'include'
        });
        if (!response.ok) {
          return { liked: false };
        }
        return response.json();
      },
      enabled: !!user && !!post?.id,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }))
  });

  // Precarregar comentários para todos os posts visíveis
  const commentsQueries = useQueries({
    queries: (posts || []).map(post => ({
      queryKey: [`/api/posts/${post.id}/comments`],
      queryFn: async (): Promise<CommentWithUser[]> => {
        const response = await fetch(`/api/posts/${post.id}/comments`, {
          credentials: 'include'
        });
        if (!response.ok) {
          return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      },
      enabled: !!post?.id,
      staleTime: 2 * 60 * 1000, // 2 minutos
    }))
  });

  // Verificar se todas as queries terminaram
  const allLikeStatusLoaded = likeStatusQueries.every(query => 
    !query.isLoading && (query.data !== undefined || query.error !== null)
  );

  const allCommentsLoaded = commentsQueries.every(query => 
    !query.isLoading && (query.data !== undefined || query.error !== null)
  );

  // Verificar se existem queries iniciais em andamento (apenas no primeiro carregamento)
  const fetchingInitialQueries = useIsFetching({ 
    predicate: (query) => {
      if (hasInitialized.current) return false; // Ignore refetches após inicialização
      
      const queryKey = query.queryKey;
      if (Array.isArray(queryKey) && queryKey.length > 0) {
        const key = queryKey[0];
        return typeof key === 'string' && (
          key.includes('/api/posts') && (
            key.includes('/like-status') || 
            key.includes('/comments') ||
            key === '/api/posts'
          )
        );
      }
      return false;
    }
  });

  // Enrichir posts com dados de comentários e likes
  const enrichedPosts = (posts || []).map((post, index) => {
    const comments = commentsQueries[index]?.data || [];
    const likeStatus = likeStatusQueries[index]?.data || { liked: false };
    
    return {
      ...post,
      commentCount: Array.isArray(comments) ? comments.length : 0,
      comments: comments,
      liked: likeStatus.liked
    };
  });

  // Marcar como inicializado quando tudo estiver carregado pela primeira vez
  useEffect(() => {
    if (!postsLoading && posts && allLikeStatusLoaded && allCommentsLoaded && fetchingInitialQueries === 0) {
      hasInitialized.current = true;
    }
  }, [postsLoading, posts, allLikeStatusLoaded, allCommentsLoaded, fetchingInitialQueries]);

  // Sistema de loading inteligente que evita flicker após carregamento inicial
  const isLoading = hasInitialized.current 
    ? false // Após inicialização, nunca mais mostra skeleton
    : (isInitialLoading || !posts || !allLikeStatusLoaded || !allCommentsLoaded || fetchingInitialQueries > 0);

  return {
    posts: enrichedPosts,
    isLoading,
    hasStartedLoading: !isInitialLoading,
    error: postsError,
    refetch: () => {
      // Recarregar todos os dados
      window.location.reload();
    }
  };
}
