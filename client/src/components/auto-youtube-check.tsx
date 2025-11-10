
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Youtube, Bell } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { YouTubeSyncModal } from "./youtube-sync-modal";

interface AutoYouTubeCheckProps {
  channelId: string;
}

export function AutoYouTubeCheck({ channelId }: AutoYouTubeCheckProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [newVideosCount, setNewVideosCount] = useState(0);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!channelId || hasChecked) return;

    const checkForNewVideos = async () => {
      try {
        setIsChecking(true);
        const response = await apiRequest<{
          newVideos: number;
        }>("POST", "/api/youtube/sync", { channelId });

        setNewVideosCount(response.newVideos);
        setHasChecked(true);
      } catch (error) {
        console.error("Erro ao verificar novos vídeos:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkForNewVideos();
  }, [channelId, hasChecked]);

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Verificando atualizações no canal...</span>
      </div>
    );
  }

  if (newVideosCount > 0) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSyncModal(true)}
          className="relative animate-pulse border-primary bg-primary/10 hover:bg-primary/20"
        >
          <Bell className="h-4 w-4 mr-2 text-primary" />
          <span className="text-primary font-medium">
            {newVideosCount} {newVideosCount === 1 ? "novo vídeo" : "novos vídeos"} disponível
          </span>
          <Badge className="ml-2 bg-primary text-primary-foreground">
            {newVideosCount}
          </Badge>
        </Button>

        <YouTubeSyncModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
        />
      </>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowSyncModal(true)}
      className="flex items-center gap-1"
    >
      <Youtube className="h-4 w-4" />
      <span>Sincronizar YouTube</span>
      <YouTubeSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />
    </Button>
  );
}
