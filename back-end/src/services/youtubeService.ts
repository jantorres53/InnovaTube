import axios from 'axios';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export class YouTubeService {
  private static API_KEY = process.env.YOUTUBE_API_KEY;
  private static BASE_URL = 'https://www.googleapis.com/youtube/v3';

  static async searchVideos(query: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
    if (!this.API_KEY) {
      throw new Error('YouTube API key no configurada');
    }

    try {
      const response = await axios.get(`${this.BASE_URL}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults,
          key: this.API_KEY
        }
      });

      return response.data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt
      }));
    } catch (error) {
      console.error('Error buscando videos de YouTube:', error);
      throw new Error('Error al buscar videos de YouTube');
    }
  }

  static async getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
    if (!this.API_KEY) {
      throw new Error('YouTube API key no configurada');
    }

    try {
      const response = await axios.get(`${this.BASE_URL}/videos`, {
        params: {
          part: 'snippet',
          id: videoId,
          key: this.API_KEY
        }
      });

      if (response.data.items.length === 0) {
        return null;
      }

      const item = response.data.items[0];
      return {
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt
      };
    } catch (error) {
      console.error('Error obteniendo detalles del video:', error);
      throw new Error('Error al obtener detalles del video');
    }
  }

  // Obtener sugerencias de búsqueda relacionadas desde el endpoint público de Google
  static async getSuggestions(query: string, maxResults: number = 8): Promise<string[]> {
    if (!query || !query.trim()) return [];
    try {
      const response = await axios.get('https://suggestqueries.google.com/complete/search', {
        params: {
          client: 'firefox', // Devuelve JSON simple
          ds: 'yt',          // Dataset de YouTube
          q: query,
        },
        timeout: 6000,
      });
      const data = response.data;
      // Formato esperado: [query, [sugerencia1, sugerencia2, ...]]
      if (Array.isArray(data) && Array.isArray(data[1])) {
        return (data[1] as string[]).slice(0, maxResults);
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo sugerencias de YouTube:', error);
      return [];
    }
  }
}