
import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!enabled || !user || !videoId || !resourceId || !playerRef.current) {
      return;
    }

    const saveProgress = async () => {
      try {
        const player = playerRef.current;
        if (!player || typeof player.getCurrentTime !== 'function') {
          return;
        }

        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();

        if (!duration || duration === 0) {
          return;
        }

        // Só salva se:
        // 1. Passou pelo menos 5 segundos desde a última gravação
        // 2. O tempo atual é maior que o último tempo salvo
        const timeDiff = Math.abs(currentTime - lastSavedTime.current);
        if (timeDiff < 5 || currentTime <= lastSavedTime.current) {
          return;
        }

        await fetch('/api/video-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            videoId,
            resourceId,
            currentTime,
            duration
          })
        });

        lastSavedTime.current = currentTime;
      } catch (error) {
        console.error('Error saving video progress:', error);
      }
    };

    // Salva o progresso a cada 10 segundos
    intervalRef.current = setInterval(saveProgress, 10000);

    // Salva ao desmontar o componente
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      saveProgress(); // Salva uma última vez ao sair
    };
  }, [videoId, resourceId, playerRef, enabled, user]);

  return null;
};
