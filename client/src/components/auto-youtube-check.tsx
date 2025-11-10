
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Youtube, Bell, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { YouTubeSyncModal } from "./youtube-sync-modal";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export function AutoYouTubeCheck() {
  const [location] = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [newVideosCount, setNewVideosCount] = useState<number | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const { data: channelData, isLoading: channelLoading } = useQuery<{ channelId: string | null; configured?: boolean }>({
    queryKey: ["/api/youtube-channel-id"],
  });

  const channelId = channelData?.channelId;
  const isConfigured = channelData?.configured !== false;

  // Simular progresso durante verificação
  useEffect(() => {
    if (!isChecking) {
      setProgress(0);
      return;
    }

    // Simular progresso gradual
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90; // Para em 90% até a resposta chegar
        return prev + Math.random() * 15; // Incrementa de forma variável
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isChecking]);

  // Verificar sempre que a página for acessada ou quando location mudar
  useEffect(() => {
    if (!channelId || !isConfigured) return;

    const checkForNewVideos = async () => {
      try {
        setIsChecking(true);
        setProgress(10); // Começa em 10%
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
          setProgress(100); // Completa quando a resposta chegar
          setNewVideosCount(response.newVideos);
          console.log('✅ Vídeos pendentes definidos:', response.newVideos);
        }
      } catch (error) {
        console.error("❌ Erro ao verificar novos vídeos:", error);
        setNewVideosCount(null);
      } finally {
        setTimeout(() => setIsChecking(false), 300); // Pequeno delay para mostrar 100%
      }
    };

    checkForNewVideos();
  }, [channelId, isConfigured, location]);

  if (channelLoading || isChecking) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Verificando atualizações...</span>
        </div>
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">
            {Math.round(progress)}%
          </p>
        </div>
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

  // Se há vídeos novos
  if (newVideosCount > 0) {
    return (
      <>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowSyncModal(true)}
          className="relative flex items-center gap-2 bg-primary hover:bg-primary/90 animate-pulse"
          data-testid="button-sync-videos"
        >
          <Bell className="h-4 w-4 animate-bounce" />
          <span className="font-semibold">
            Sincronizar {newVideosCount} {newVideosCount === 1 ? "vídeo novo" : "vídeos novos"}
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
