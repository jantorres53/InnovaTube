import { Request, Response } from 'express';
import { YouTubeService } from '../services/youtubeService';
import { Favorite } from '../models/Favorite';
import { authenticate } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export class VideoController {
  static async searchVideos(req: Request, res: Response): Promise<void> {
    try {
      const { query, maxResults = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          message: 'El parámetro de búsqueda es requerido'
        });
        return;
      }

      const videos = await YouTubeService.searchVideos(query, Number(maxResults));

      res.json({
        success: true,
        data: {
          videos,
          total: videos.length
        }
      });
    } catch (error) {
      console.error('Error buscando videos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar videos'
      });
    }
  }

  static async getFavorites(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const favorites = await Favorite.find({ userId: req.user._id })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: {
          favorites,
          total: favorites.length
        }
      });
    } catch (error) {
      console.error('Error obteniendo favoritos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener favoritos'
      });
    }
  }

  static async addToFavorites(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { videoId, title, description, thumbnail, channelTitle, publishedAt } = req.body;

      if (!videoId || !title || !thumbnail || !channelTitle || !publishedAt) {
        res.status(400).json({
          success: false,
          message: 'Todos los campos del video son requeridos'
        });
        return;
      }

      // Verificar si ya existe en favoritos
      const existingFavorite = await Favorite.findOne({
        userId: req.user._id,
        videoId
      });

      if (existingFavorite) {
        res.status(400).json({
          success: false,
          message: 'El video ya está en favoritos'
        });
        return;
      }

      const favorite = new Favorite({
        userId: req.user._id,
        videoId,
        title,
        description,
        thumbnail,
        channelTitle,
        publishedAt: new Date(publishedAt)
      });

      await favorite.save();

      res.status(201).json({
        success: true,
        message: 'Video agregado a favoritos',
        data: {
          favorite
        }
      });
    } catch (error) {
      console.error('Error agregando a favoritos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar a favoritos'
      });
    }
  }

  static async removeFromFavorites(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { videoId } = req.params;

      const favorite = await Favorite.findOneAndDelete({
        userId: req.user._id,
        videoId
      });

      if (!favorite) {
        res.status(404).json({
          success: false,
          message: 'Video no encontrado en favoritos'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Video eliminado de favoritos'
      });
    } catch (error) {
      console.error('Error eliminando de favoritos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar de favoritos'
      });
    }
  }
}