
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Youtube, Bell, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { YouTubeSyncModal } from "./youtube-sync-modal";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface AutoYouTubeCheckProps {
  onSyncClick?: () => void;
  onRefreshReady?: (refreshFn: () => void) => void;
  mode?: "modal" | "inline";
}

export function AutoYouTubeCheck({ onSyncClick, onRefreshReady, mode = "modal" }: AutoYouTubeCheckProps = {}) {
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

  // Função de verificação reutilizável
  const checkForNewVideos = useCallback(async () => {
    if (!channelId || !isConfigured) return;

    try {
      setIsChecking(true);
      setProgress(10);
      console.log('🔍 Verificando vídeos pendentes do canal:', channelId);
      
      const res = await apiRequest("POST", "/api/youtube/sync", { channelId });
      const response = await res.json();

      console.log('📊 Resultado da verificação:', {
        total: response.totalChannelVideos,
        cadastrados: response.existingVideos,
        pendentes: response.newVideos
      });

      if (response.newVideos !== undefined) {
        setProgress(100);
        setNewVideosCount(response.newVideos);
        console.log('✅ Vídeos pendentes definidos:', response.newVideos);
      }
    } catch (error: any) {
      console.error("❌ Erro ao verificar novos vídeos:", error);
      console.error("Erro completo:", error.message);
      
      const errorMessage = error.message || '';
      const is401 = errorMessage.includes('401');
      const is403 = errorMessage.includes('403');
      
      if (is401 || is403) {
        console.warn("⚠️ Usuário não autenticado ou sem permissão admin");
        console.warn("Erro:", errorMessage);
      }
      
      setNewVideosCount(null);
    } finally {
      setTimeout(() => setIsChecking(false), 300);
    }
  }, [channelId, isConfigured]);

  // Simular progresso durante verificação
  useEffect(() => {
    if (!isChecking) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 15;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isChecking]);

  // Verificar sempre que a página for acessada ou quando location mudar
  useEffect(() => {
    checkForNewVideos();
  }, [checkForNewVideos, location]);

  // Expor função de refresh para componente pai
  useEffect(() => {
    if (onRefreshReady && channelId && isConfigured) {
      const refreshPendingVideos = () => {
        setNewVideosCount(0);
        checkForNewVideos();
      };
      onRefreshReady(refreshPendingVideos);
    }
  }, [onRefreshReady, checkForNewVideos, channelId, isConfigured]);

  if (channelLoading || isChecking) {
    return (
      <div className={`flex flex-col gap-2 ${mode === "inline" ? "w-full" : "w-auto min-w-[200px] max-w-[280px]"}`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
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
        className={`flex items-center gap-2 bg-primary hover:bg-primary/90 whitespace-nowrap ${mode === "inline" ? "w-full justify-center" : "w-auto"}`}
        data-testid="button-config-apis"
      >
        <Youtube className="h-4 w-4" />
        <span>Configurar APIs</span>
      </Button>
    );
  }

  const handleSyncClick = () => {
    if (onSyncClick && mode === "inline") {
      onSyncClick();
    } else {
      setShowSyncModal(true);
    }
  };

  // Se há vídeos novos
  if (newVideosCount > 0) {
    return (
      <>
        <Button
          variant="default"
          size="sm"
          onClick={handleSyncClick}
          className={`relative flex items-center gap-2 bg-primary hover:bg-primary/90 animate-pulse whitespace-nowrap ${mode === "inline" ? "w-full justify-center" : "w-auto"}`}
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

        {mode === "modal" && (
          <YouTubeSyncModal
            isOpen={showSyncModal}
            onClose={() => setShowSyncModal(false)}
          />
        )}
      </>
    );
  }

  // Se não há vídeos novos (tudo sincronizado)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSyncClick}
        className={`flex items-center gap-2 whitespace-nowrap ${mode === "inline" ? "w-full justify-center" : "w-auto"}`}
        data-testid="button-synced"
      >
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span>Sincronizado</span>
      </Button>

      {mode === "modal" && (
        <YouTubeSyncModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
        />
      )}
    </>
  );
}
