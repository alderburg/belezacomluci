
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Youtube, Bell, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { YouTubeSyncModal } from "./youtube-sync-modal";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export function AutoYouTubeCheck() {
  const [location] = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [newVideosCount, setNewVideosCount] = useState<number | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const { data: channelData, isLoading: channelLoading } = useQuery<{ channelId: string | null; configured?: boolean }>({
    queryKey: ["/api/youtube-channel-id"],
  });

  const channelId = channelData?.channelId;
  const isConfigured = channelData?.configured !== false;

  // Verificar sempre que a página for acessada ou quando location mudar
  useEffect(() => {
    if (!channelId || !isConfigured) return;

    const checkForNewVideos = async () => {
      try {
        setIsChecking(true);
        console.log('🔍 Verificando vídeos pendentes do canal:', channelId);
        
        const response = await apiRequest<{
          totalChannelVideos: number;
          existingVideos: number;
          newVideos: number;
          videos: any[];
        }>("POST", "/api/youtube/sync", { channelId });

        console.log('📊 Resultado da verificação:', {
          total: response.totalChannelVideos,
          cadastrados: response.existingVideos,
          pendentes: response.newVideos
        });

        // Garantir que o número seja mantido
        if (response.newVideos !== undefined) {
          setNewVideosCount(response.newVideos);
          console.log('✅ Vídeos pendentes definidos:', response.newVideos);
        }
      } catch (error) {
        console.error("❌ Erro ao verificar novos vídeos:", error);
        setNewVideosCount(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkForNewVideos();
  }, [channelId, isConfigured, location]);

  if (channelLoading || isChecking) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Verificando atualizações...</span>
      </div>
    );
  }

  if (!isConfigured || !channelId) {
    const handleConfigClick = () => {
      window.location.href = '/perfil/configuracoes/apis';
    };
    return (
      <Button
        variant="default"
        size="sm"
        onClick={handleConfigClick}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90"
        data-testid="button-config-apis"
      >
        <Youtube className="h-4 w-4" />
        <span>Configurar APIs</span>
      </Button>
    );
  }

  // Se newVideosCount ainda não foi carregado, mostrar loading
  if (newVideosCount === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Verificando...</span>
      </div>
    );
  }

  // Se há vídeos novos
  if (newVideosCount > 0) {
    return (
      <>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowSyncModal(true)}
          className="relative flex items-center gap-2 bg-primary hover:bg-primary/90 animate-pulse"
        >
          <Bell className="h-4 w-4 animate-bounce" />
          <span className="font-semibold">
            Importar {newVideosCount} {newVideosCount === 1 ? "vídeo novo" : "vídeos novos"}
          </span>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </Button>

        <YouTubeSyncModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
        />
      </>
    );
  }

  // Se não há vídeos novos (tudo sincronizado)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSyncModal(true)}
        className="flex items-center gap-2"
      >
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span>Sincronizado</span>
      </Button>

      <YouTubeSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />
    </>
  );
}
