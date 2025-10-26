
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';

interface UseVideoProgressProps {
  videoId: string;
  resourceId: string;
  playerRef: React.RefObject<any>; // YouTube Player instance
  enabled?: boolean;
}

export const useVideoProgress = ({ 
  videoId, 
  resourceId, 
  playerRef,
  enabled = true 
}: UseVideoProgressProps) => {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTime = useRef<number>(0);
  const isSavingRef = useRef<boolean>(false);

  const saveProgress = useCallback(async () => {
    if (isSavingRef.current) return;
    
    try {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') {
        return;
      }

      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();

      if (!duration || duration === 0 || currentTime <= 0) {
        return;
      }

      isSavingRef.current = true;

      await fetch('/api/video-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          videoId,
          resourceId,
          currentTime: Math.floor(currentTime),
          duration: Math.floor(duration)
        })
      });

      lastSavedTime.current = currentTime;
    } catch (error) {
      console.error('Error saving video progress:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [videoId, resourceId, playerRef]);

  const stopProgressSaving = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Salva uma última vez antes de parar
    saveProgress();
  }, [saveProgress]);

  useEffect(() => {
    if (!enabled || !user || !videoId || !resourceId) {
      return;
    }

    // Limpar intervalo anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Aguardar um pouco para o player estar pronto
    const startTimer = setTimeout(() => {
      if (playerRef.current) {
        // Salva o progresso a cada 5 segundos
        intervalRef.current = setInterval(saveProgress, 5000);
      }
    }, 2000);

    // Cleanup ao desmontar ou trocar de vídeo
    return () => {
      clearTimeout(startTimer);
      stopProgressSaving();
    };
  }, [videoId, resourceId, enabled, user, saveProgress, stopProgressSaving, playerRef]);

  return { stopProgressSaving, saveProgress };
};
