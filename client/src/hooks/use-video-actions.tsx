
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useVideoActions(videoId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to like video');
      }

      const result = await response.json();
      return result;
    },
    onSuccess: async (result) => {
      // Invalidate all video-related queries to update like counts everywhere
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/videos"] }),
        queryClient.invalidateQueries({ queryKey: ["video", videoId] }),
        queryClient.invalidateQueries({ queryKey: ["user-like", videoId] })
      ]);
      
      toast({
        title: result.isLiked ? "Vídeo curtido!" : "Curtida removida",
        description: result.isLiked ? "Obrigada pelo carinho!" : "Curtida removida",
      });

      return result;
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível curtir o vídeo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return {
    likeMutation,
  };
}
