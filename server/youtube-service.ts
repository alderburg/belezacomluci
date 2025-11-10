import https from 'https';
import { getYoutubeApiKey, ApiCredentialsError } from './lib/apiSettings';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  publishedAt: string;
}

interface YouTubeChannel {
  id: string;
  title: string;
  uploadsPlaylistId: string;
}

export class YouTubeService {
  private async getApiKey(): Promise<string> {
    try {
      return await getYoutubeApiKey();
    } catch (error) {
      if (error instanceof ApiCredentialsError) {
        throw error;
      }
      throw new Error('Erro ao obter credenciais da API do YouTube');
    }
  }

  private async makeRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(parsed.error.message || 'Erro na API do YouTube'));
            } else {
              resolve(parsed);
            }
          } catch (error) {
            reject(new Error('Erro ao processar resposta da API'));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  private parseDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '00:00';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  async getChannelId(channelHandle: string): Promise<string> {
    const apiKey = await this.getApiKey();
    const url = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(channelHandle)}&key=${apiKey}`;
    
    try {
      const data = await this.makeRequest(url);
      if (data.items && data.items.length > 0) {
        return data.items[0].id;
      }
      throw new Error('Canal não encontrado');
    } catch (error) {
      throw new Error(`Erro ao buscar canal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async getChannelUploadsPlaylist(channelId: string): Promise<string> {
    const apiKey = await this.getApiKey();
    const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
    
    try {
      const data = await this.makeRequest(url);
      if (data.items && data.items.length > 0) {
        return data.items[0].contentDetails.relatedPlaylists.uploads;
      }
      throw new Error('Playlist de uploads não encontrada');
    } catch (error) {
      throw new Error(`Erro ao buscar playlist: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async getPlaylistVideos(playlistId: string, maxResults: number = 50): Promise<YouTubeVideo[]> {
    const videos: YouTubeVideo[] = [];
    let nextPageToken: string | null = null;
    const apiKey = await this.getApiKey();
    const pageSize = 50; // Máximo permitido pela API do YouTube por requisição

    try {
      do {
        const url = nextPageToken
          ? `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${pageSize}&pageToken=${nextPageToken}&key=${apiKey}`
          : `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${pageSize}&key=${apiKey}`;

        const data = await this.makeRequest(url);

        if (data.items && data.items.length > 0) {
          const videoIds = data.items
            .map((item: any) => item.contentDetails.videoId)
            .filter((id: string) => id);

          if (videoIds.length > 0) {
            const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`;
            const videoDetails = await this.makeRequest(videoDetailsUrl);

            if (videoDetails.items) {
              for (const video of videoDetails.items) {
                videos.push({
                  id: video.id,
                  title: video.snippet.title,
                  description: video.snippet.description,
                  thumbnailUrl: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
                  duration: this.parseDuration(video.contentDetails.duration),
                  publishedAt: video.snippet.publishedAt,
                });
              }
            }
          }
        }

        nextPageToken = data.nextPageToken || null;
        
        // Continuar buscando até não ter mais páginas OU até atingir o maxResults (se especificado e não for o padrão)
        // Se maxResults for muito alto (500+), buscar todos os vídeos
      } while (nextPageToken && (maxResults >= 500 || videos.length < maxResults));

      return videos;
    } catch (error) {
      throw new Error(`Erro ao buscar vídeos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async getAllChannelVideos(channelId: string, maxResults: number = 1000): Promise<YouTubeVideo[]> {
    try {
      console.log('🎬 YouTubeService: Obtendo playlist de uploads do canal:', channelId);
      const uploadsPlaylistId = await this.getChannelUploadsPlaylist(channelId);
      console.log('📋 Playlist ID:', uploadsPlaylistId);
      
      console.log('🔄 YouTubeService: Buscando vídeos da playlist (máx:', maxResults, ')');
      const videos = await this.getPlaylistVideos(uploadsPlaylistId, maxResults);
      console.log('✅ YouTubeService: Total de vídeos retornados:', videos.length);
      
      return videos;
    } catch (error) {
      throw new Error(`Erro ao buscar vídeos do canal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
    const apiKey = await this.getApiKey();
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
    
    try {
      const data = await this.makeRequest(url);
      if (data.items && data.items.length > 0) {
        const video = data.items[0];
        return {
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnailUrl: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
          duration: this.parseDuration(video.contentDetails.duration),
          publishedAt: video.snippet.publishedAt,
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar detalhes do vídeo:', error);
      return null;
    }
  }
}

export const youtubeService = new YouTubeService();
