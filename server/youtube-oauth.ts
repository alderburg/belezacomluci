import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];

export class YouTubeOAuth {
  private oauth2Client: OAuth2Client;

  constructor() {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : process.env.BASE_URL || 'https://your-repl-name.your-username.repl.co'
      : 'http://localhost:5000';
      
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/auth/google/callback`
    );
  }

  // Gera URL de autorização
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      include_granted_scopes: true,
      prompt: 'consent', // Força nova autorização
      state: Math.random().toString(36).substring(7), // Estado aleatório para segurança
    });
  }

  // Troca código por tokens
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  // Configura credenciais do cliente
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Curte um vídeo no YouTube
  async likeVideo(videoId: string, tokens: any): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials(tokens);
      
      const youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client,
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
      this.oauth2Client.setCredentials(tokens);
      
      const youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client,
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
      this.oauth2Client.setCredentials(tokens);
      
      const youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client,
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
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      throw error;
    }
  }
}

export const youtubeOAuth = new YouTubeOAuth();