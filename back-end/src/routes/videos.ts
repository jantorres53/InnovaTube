import express from 'express';
import { VideoController } from '../controllers/videoController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Rutas de videos (públicas)
router.get('/search', VideoController.searchVideos);
router.get('/suggestions', VideoController.suggestions);

// Rutas de favoritos (protegidas)
router.get('/favorites', authenticate, VideoController.getFavorites);
router.post('/favorites', authenticate, VideoController.addToFavorites);
router.delete('/favorites/:videoId', authenticate, VideoController.removeFromFavorites);

export default router;