import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface DataUpdateMessage {
  type: 'data_update';
  dataType: 'videos' | 'products' | 'coupons' | 'banners' | 'categories' | 'popups' | 'notifications' | 'users' | 'user_stats' | 'user_activity' | 'user_referrals' | 'posts' | 'gamification';
  action: 'created' | 'updated' | 'deleted';
  data?: any;
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useDataSync() {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Função para obter o token JWT
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/token', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    return null;
  };

  // Função para conectar ao WebSocket
  const connect = async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Authentication token not available');
        return;
      }

      let baseWsUrl = import.meta.env.VITE_WEBSOCKET;
      if (!baseWsUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        baseWsUrl = `${protocol}//${host}`;
      }

      const wsUrl = `${baseWsUrl}/ws/notifications?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('Data sync WebSocket connected');

        // Configurar heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          if (!event.data || typeof event.data !== 'string') {
            console.warn('Invalid WebSocket data received:', event.data);
            return;
          }

          const message = JSON.parse(event.data);

          if (message && message.type === 'data_update') {
            console.log('Data update received:', message.dataType, '-', message.action);

            // Usar função de invalidação detalhada para melhor controle
            invalidateRelevantQueries(message.dataType, message.action, message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message in data sync:', error, 'Raw data:', event.data);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        console.log('Data sync WebSocket disconnected');

        // Limpar heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('Data sync WebSocket error:', error);
        setError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to connect data sync WebSocket:', error);
      setError('Failed to establish WebSocket connection');
      scheduleReconnect();
    }
  };

  // Função para agendar reconexão
  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect data sync WebSocket...');
      connect();
    }, 5000);
  };

  // Manipulador de mensagens WebSocket
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    if (message.type === 'data_update') {
      const dataMessage = message as DataUpdateMessage;
      console.log(`Data update received: ${dataMessage.dataType} - ${dataMessage.action}`);
      invalidateRelevantQueries(dataMessage.dataType, dataMessage.action, dataMessage.data);
    }
  };

  // Invalidar queries relevantes baseado no tipo de dados
  const invalidateRelevantQueries = (dataType: string, action: string, data?: any) => {
    console.log(`Invalidating queries for: ${dataType} - ${action}`);

    switch (dataType) {
      case 'videos':
        queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
        queryClient.invalidateQueries({ queryKey: ['/api/videos', { exclusive: true }] });
        queryClient.invalidateQueries({ queryKey: ['/api/videos', { exclusive: false }] });
        break;

      case 'products':
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        queryClient.invalidateQueries({ queryKey: ['/api/produtos'] });
        break;

      case 'coupons':
        queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
        queryClient.invalidateQueries({ queryKey: ['/api/cupons'] });
        break;

      case 'banners':
        queryClient.invalidateQueries({ queryKey: ['/api/banners'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
        break;

      case 'categories':
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        console.log('Categories cache invalidated - UI will refresh with new data');
        break;

      case 'popups':
        queryClient.invalidateQueries({ queryKey: ['/api/admin/popups'] });
        queryClient.invalidateQueries({ queryKey: ['/api/popups'] });
        console.log('Popups cache invalidated - UI will refresh with new data');
        break;

      case 'notifications':
        queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        console.log('Notifications cache invalidated - UI will refresh with new data');
        break;

      case 'users':
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        // Sempre invalidar configurações da comunidade e perfil público quando há mudanças em users
        queryClient.invalidateQueries({ queryKey: ['/api/admin/public-profile'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/community-settings'] });
        
        // Forçar refetch imediato
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/community-settings'],
          type: 'active'
        });
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/public-profile'],
          type: 'active'
        });
        
        console.log('Admin public profile and community settings cache invalidated and refetched - Pages will refresh');
        console.log('Users cache invalidated - UI will refresh with new data');
        break;

      case 'user_stats':
        queryClient.invalidateQueries({ queryKey: ['/api/user/stats'] });
        console.log('User stats cache invalidated - Profile stats will refresh with new data');
        break;

      case 'user_activity':
        queryClient.invalidateQueries({ queryKey: ['/api/user/activity'] });
        console.log('User activity cache invalidated - Profile activity will refresh with new data');
        break;

      case 'posts':
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
        // Invalidar também queries específicas de comentários se houver
        if (data?.postId) {
          queryClient.invalidateQueries({ queryKey: [`/api/posts/${data.postId}/comments`] });
        }
        console.log('Posts cache invalidated - Community posts will refresh with new data');
        break;

      case 'user_referrals':
        queryClient.invalidateQueries({ queryKey: ['/api/user/referral-stats'] });
        console.log('User referrals cache invalidated - Profile referral stats will refresh with new data');
        break;

      case 'gamification':
        // Invalidar todas as queries relacionadas à gamificação
        queryClient.invalidateQueries({ queryKey: ['/api/gamification/user-points'] });
        queryClient.invalidateQueries({ queryKey: ['/api/gamification/ranking'] });
        queryClient.invalidateQueries({ queryKey: ['/api/gamification/missions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/gamification/raffles'] });
        queryClient.invalidateQueries({ queryKey: ['/api/gamification/rewards'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/missions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/raffles'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/rewards'] });
        console.log('Gamification cache invalidated - Cheirosas page will refresh with new data');
        break;
    }
  };

  // Função para desconectar
  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Disconnecting intentionally');
      wsRef.current = null;
    }

    setIsConnected(false);
  };

  // Conectar automaticamente quando o hook é usado
  useEffect(() => {
    connect();

    // Cleanup ao desmontar
    return () => {
      disconnect();
    };
  }, []);

  // Reconectar quando a aba volta ao foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isConnected) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected]);

  return {
    isConnected,
    error,
    connect,
    disconnect
  };
}