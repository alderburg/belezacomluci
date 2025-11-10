import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getGoogleOAuthCredentials, ApiCredentialsError } from './lib/apiSettings';

const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];

export class YouTubeOAuth {
  private oauth2Client: OAuth2Client | null = null;
  private credentialsPromise: Promise<void> | null = null;

  private async initializeOAuthClient() {
    if (this.oauth2Client) return;

    if (!this.credentialsPromise) {
      this.credentialsPromise = (async () => {
        try {
          const { clientId, clientSecret } = await getGoogleOAuthCredentials();
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? process.env.REPL_SLUG 
              ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
              : process.env.BASE_URL || 'https://your-repl-name.your-username.repl.co'
            : 'http://localhost:5000';
            
          this.oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            `${baseUrl}/api/auth/google/callback`
          );
        } catch (error) {
          if (error instanceof ApiCredentialsError) {
            throw error;
          }
          throw new Error('Erro ao inicializar cliente OAuth do Google');
        }
      })();
    }

    await this.credentialsPromise;
  }

  private async getClient(): Promise<OAuth2Client> {
    await this.initializeOAuthClient();
    if (!this.oauth2Client) {
      throw new Error('Cliente OAuth não inicializado');
    }
    return this.oauth2Client;
  }

  // Gera URL de autorização
  async getAuthUrl(): Promise<string> {
    const client = await this.getClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      include_granted_scopes: true,
      prompt: 'consent', // Força nova autorização
      state: Math.random().toString(36).substring(7), // Estado aleatório para segurança
    });
  }

  // Troca código por tokens
  async getTokens(code: string) {
    const client = await this.getClient();
    const { tokens } = await client.getToken(code);
    return tokens;
  }

  // Configura credenciais do cliente
  async setCredentials(tokens: any) {
    const client = await this.getClient();
    client.setCredentials(tokens);
  }

  // Curte um vídeo no YouTube
  async likeVideo(videoId: string, tokens: any): Promise<boolean> {
    try {
      const client = await this.getClient();
      client.setCredentials(tokens);
      
      const youtube = google.youtube({
        version: 'v3',
        auth: client,
      });

      await youtube.videos.rate({
        id: videoId,
        rating: 'like',
      });

      return true;
    } catch (error) {
      console.error('Erro ao curtir vídeo no YouTube:', error);
      return false;
    }
  }

  // Remove curtida de um vídeo no YouTube
  async unlikeVideo(videoId: string, tokens: any): Promise<boolean> {
    try {
      const client = await this.getClient();
      client.setCredentials(tokens);
      
      const youtube = google.youtube({
        version: 'v3',
        auth: client,
      });

      await youtube.videos.rate({
        id: videoId,
        rating: 'none',
      });

      return true;
    } catch (error) {
      console.error('Erro ao remover curtida no YouTube:', error);
      return false;
    }
  }

  // Verifica se o usuário curtiu um vídeo
  async getUserVideoRating(videoId: string, tokens: any): Promise<string> {
    try {
      const client = await this.getClient();
      client.setCredentials(tokens);
      
      const youtube = google.youtube({
        version: 'v3',
        auth: client,
      });

      const response = await youtube.videos.getRating({
        id: videoId,
      });

      return response.data.items?.[0]?.rating || 'none';
    } catch (error) {
      console.error('Erro ao verificar rating do vídeo:', error);
      return 'none';
    }
  }

  // Atualiza token usando refresh token
  async refreshAccessToken(refreshToken: string) {
    try {
      const client = await this.getClient();
      client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      throw error;
    }
  }
}

export const youtubeOAuth = new YouTubeOAuth();