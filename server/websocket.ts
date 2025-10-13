import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

class NotificationWebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/notifications',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.setupHeartbeat();
  }

  private verifyClient(info: any): boolean {
    try {
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        return false;
      }

      // Verificar token JWT
      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        console.error('WebSocket connection rejected: SESSION_SECRET not configured');
        return false;
      }
      const decoded = jwt.verify(token, secret) as any;
      
      if (decoded && decoded.userId) {
        info.req.userId = decoded.userId;
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, request: any) {
    const userId = request.userId;
    ws.userId = userId;
    ws.isAlive = true;

    // Adicionar cliente à lista
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(ws);

    // Enviar notificações não lidas imediatamente
    this.sendUnreadNotifications(userId, ws);

    // Handler para pong (heartbeat)
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handler para desconexão
    ws.on('close', () => {
      this.clients.get(userId)?.delete(ws);
      if (this.clients.get(userId)?.size === 0) {
        this.clients.delete(userId);
      }
    });

    // Handler para mensagens do cliente
    ws.on('message', (data) => {
      try {
        const messageString = data.toString();
        if (!messageString.trim()) {
          console.warn('Empty WebSocket message received from user:', userId);
          return;
        }
        
        // Verificar se a mensagem é um JSON válido antes de fazer parse
        let message;
        try {
          message = JSON.parse(messageString);
        } catch (parseError) {
          console.warn('Invalid JSON received from client:', messageString, 'User:', userId);
          return;
        }
        
        this.handleClientMessage(userId, message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error, 'User:', userId);
      }
    });
  }

  private async sendUnreadNotifications(userId: string, ws: AuthenticatedWebSocket) {
    try {
      const notifications = await storage.getUserNotifications(userId, false); // false = unread only
      if (notifications.length > 0) {
        ws.send(JSON.stringify({
          type: 'unread_notifications',
          data: notifications
        }));
      }
    } catch (error) {
      console.error('Error sending unread notifications:', error);
    }
  }

  private async handleClientMessage(userId: string, message: any) {
    // Validate message structure
    if (!message || typeof message !== 'object' || !message.type) {
      console.warn('Invalid WebSocket message received:', message);
      return;
    }

    switch (message.type) {
      case 'mark_as_read':
        try {
          if (!message.notificationId) {
            throw new Error('notificationId is required');
          }
          
          // Marcar notificação como lida no banco de dados
          await storage.markNotificationAsRead(userId, message.notificationId);
          
          // Confirmar para o cliente que a operação foi bem-sucedida
          this.broadcastToUser(userId, {
            type: 'notification_read',
            notificationId: message.notificationId,
            success: true
          });
        } catch (error) {
          console.error('Error marking notification as read via WebSocket:', error);
          this.broadcastToUser(userId, {
            type: 'notification_read',
            notificationId: message.notificationId,
            success: false,
            error: 'Failed to mark as read'
          });
        }
        break;
        
      case 'mark_all_as_read':
        try {
          // Marcar todas as notificações como lidas
          await storage.markAllNotificationsAsRead(userId);
          
          this.broadcastToUser(userId, {
            type: 'all_notifications_read',
            success: true
          });
        } catch (error) {
          console.error('Error marking all notifications as read via WebSocket:', error);
          this.broadcastToUser(userId, {
            type: 'all_notifications_read',
            success: false,
            error: 'Failed to mark all as read'
          });
        }
        break;
        
      case 'request_notifications':
        // Cliente solicita notificações atualizadas
        await this.sendUnreadNotifications(userId, this.getConnectionByUserId(userId)!);
        break;
        
      case 'ping':
        // Heartbeat do cliente
        const userSockets = this.clients.get(userId);
        userSockets?.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        });
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  // Método auxiliar para obter uma conexão ativa do usuário
  private getConnectionByUserId(userId: string): AuthenticatedWebSocket | null {
    const userSockets = this.clients.get(userId);
    if (userSockets && userSockets.size > 0) {
      return Array.from(userSockets)[0]; // Retorna a primeira conexão ativa
    }
    return null;
  }

  // Método principal para enviar nova notificação para usuários específicos
  public async broadcastNewNotification(userIds: string[], notification: any) {
    const message = {
      type: 'new_notification',
      data: notification
    };

    for (const userId of userIds) {
      this.broadcastToUser(userId, message);
    }
  }

  // Enviar mensagem para todas as conexões de um usuário específico
  public broadcastToUser(userId: string, message: any) {
    const userSockets = this.clients.get(userId);
    if (userSockets) {
      userSockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  // Enviar para todos os usuários conectados
  public broadcastToAll(message: any) {
    this.clients.forEach((sockets) => {
      sockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    });
  }

  // Sistema de heartbeat para manter conexões vivas
  private setupHeartbeat() {
    setInterval(() => {
      this.clients.forEach((sockets, userId) => {
        sockets.forEach(ws => {
          if (!ws.isAlive) {
            ws.terminate();
            sockets.delete(ws);
            return;
          }

          ws.isAlive = false;
          ws.ping();
        });
        
        // Limpar usuários sem conexões ativas
        if (sockets.size === 0) {
          this.clients.delete(userId);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  // Obter estatísticas de conexões
  public getStats() {
    const totalConnections = Array.from(this.clients.values())
      .reduce((total, sockets) => total + sockets.size, 0);
    
    return {
      connectedUsers: this.clients.size,
      totalConnections,
      userConnections: Array.from(this.clients.entries()).map(([userId, sockets]) => ({
        userId,
        connections: sockets.size
      }))
    };
  }

  // Broadcast community settings update to all connected users
  public broadcastCommunityUpdate(settings: any) {
    const message = {
      type: 'community_update',
      data: settings,
      timestamp: new Date().toISOString()
    };

    this.broadcastToAll(message);
  }

  // Broadcast user profile update
  public broadcastUserUpdate(userId: string, userProfile: any) {
    const message = {
      type: 'user_update',
      data: userProfile,
      timestamp: new Date().toISOString()
    };

    this.broadcastToUser(userId, message);
  }

  // Método principal para broadcast de atualizações de dados
  public broadcastDataUpdate(dataType: 'videos' | 'products' | 'coupons' | 'banners' | 'categories' | 'popups' | 'notifications' | 'users' | 'posts' | 'gamification', action: 'created' | 'updated' | 'deleted', data?: any) {
    try {
      const message = {
        type: 'data_update',
        dataType,
        action,
        data,
        timestamp: new Date().toISOString()
      };

      // Verificar se a mensagem pode ser serializada
      const serializedMessage = JSON.stringify(message);
      console.log(`Broadcasting data update: ${dataType} - ${action}`, data ? `with data: ${JSON.stringify(data).substring(0, 100)}...` : 'without data');

      // Enviar para todos os clientes conectados
      this.clients.forEach((clientSet, userId) => {
        clientSet.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(serializedMessage);
            } catch (error) {
              console.error(`Error sending data update message to user ${userId}:`, error);
            }
          } else {
            // Remover conexões mortas
            clientSet.delete(ws);
          }
        });
        
        // Limpar usuários sem conexões ativas
        if (clientSet.size === 0) {
          this.clients.delete(userId);
        }
      });
    } catch (error) {
      console.error('Error in broadcastDataUpdate:', error, 'DataType:', dataType, 'Action:', action);
    }
  }
}

export { NotificationWebSocketService };