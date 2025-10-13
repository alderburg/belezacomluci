import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface NotificationMessage {
  type: 'new_notification' | 'notification_read' | 'all_notifications_read' | 'unread_notifications' | 'pong';
  data?: any;
  notificationId?: string;
  success?: boolean;
  error?: string;
}

export function useNotificationsWebSocket() {
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
        credentials: 'include' // Incluir cookies de sessão
      });
      if (response.ok) {
        const data = await response.json();
        return data.token;
      } else {
        console.error('Failed to get auth token - status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    return null;
  };

  // Função para conectar ao WebSocket
  const connect = async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Já conectado
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Authentication token not available');
        return;
      }

      // Usar a variável de ambiente WEBSOCKET ou fallback para o domínio atual
      let baseWsUrl = import.meta.env.VITE_WEBSOCKET;

      if (!baseWsUrl) {
        // Fallback: construir URL baseado no domínio atual
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

        // Configurar heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping a cada 30 segundos
      };

      ws.onmessage = (event) => {
        try {
          // Verificar se a mensagem não está vazia ou é apenas espaços em branco
          if (!event.data || !event.data.toString().trim()) {
            console.warn('Empty WebSocket message received, ignoring...');
            return;
          }
          
          const message: NotificationMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);

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
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
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
      console.log('Attempting to reconnect WebSocket...');
      connect();
    }, 5000); // Reconectar após 5 segundos
  };

  // Manipulador de mensagens WebSocket
  const handleWebSocketMessage = (message: NotificationMessage) => {
    switch (message.type) {
      case 'new_notification':
        // Invalidar cache de notificações para forçar atualização
        queryClient.invalidateQueries({ queryKey: ['/api/user-notifications'] });

        // Mostrar notificação no browser se permitido
        if ('Notification' in window && Notification.permission === 'granted') {
          const notification = message.data?.notification;
          if (notification) {
            new Notification(notification.title, {
              body: notification.description || 'Nova notificação',
              icon: notification.imageUrl || '/favicon.ico',
              tag: notification.id // Evita duplicatas
            });
          }
        }
        break;

      case 'notification_read':
        // Invalidar cache para atualizar contadores
        queryClient.invalidateQueries({ queryKey: ['/api/user-notifications'] });
        break;

      case 'all_notifications_read':
        // Invalidar cache para atualizar todas as notificações
        queryClient.invalidateQueries({ queryKey: ['/api/user-notifications'] });
        break;

      case 'unread_notifications':
        // Atualizar cache com dados recebidos
        if (message.data) {
          queryClient.setQueryData(['/api/user-notifications'], message.data);
        }
        break;

      case 'pong':
        // Resposta ao ping - conexão ativa
        break;

      default:
        // Mensagem desconhecida ignorada
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

  // Solicitar permissão para notificações do browser
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  // Conectar automaticamente quando o hook é usado
  useEffect(() => {
    connect();
    requestNotificationPermission();

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

  // Funções para enviar mensagens via WebSocket
  const sendWebSocketMessage = (message: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  const markNotificationAsRead = (notificationId: string) => {
    return sendWebSocketMessage({
      type: 'mark_as_read',
      notificationId: notificationId
    });
  };

  const markAllNotificationsAsRead = () => {
    return sendWebSocketMessage({
      type: 'mark_all_as_read'
    });
  };

  const requestNotificationsUpdate = () => {
    return sendWebSocketMessage({
      type: 'request_notifications'
    });
  };

  return {
    isConnected,
    error,
    connect,
    disconnect,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    requestNotificationsUpdate
  };
}