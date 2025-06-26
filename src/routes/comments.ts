import express, { Request, Response } from 'express';
import Comment from '../models/Comment';
import Post from '../models/Post';
import authMiddleware from '../middleware/auth';
import mongoose from 'mongoose';
import { CommentService } from '../services/commentService';

const router = express.Router();

// Ajouter ou retirer un like sur un commentaire
router.post('/:id/like', authMiddleware, async (req: Request & { user?: { id: string } }, res: Response) => {
  try {
    const likes = await CommentService.likeComment(req.params.id, req.user?.id);
    res.json(likes);
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'Utilisateur non authentifié':
          return res.status(401).json({ message: error.message });
        case 'ID de commentaire invalide':
          return res.status(400).json({ message: error.message });
        case 'Commentaire non trouvé':
          return res.status(404).json({ message: error.message });
        default:
          return res.status(500).json({ message: 'Erreur serveur', error: error.message });
      }
    }
  }
});

// Mettre à jour le schéma Comment pour inclure des médias (images)
router.post('/:id/media', authMiddleware, async (req: Request & { user?: { id: string } }, res: Response) => {
  try {
    const updatedComment = await CommentService.updateCommentSchemaWithMedia(
      req.params.id,
      req.user?.id,
      req.body.media
    );

    res.json({
      message: 'Médias ajoutés au commentaire avec succès',
      comment: updatedComment
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'Utilisateur non authentifié':
          return res.status(401).json({ message: error.message });
        case 'ID de commentaire invalide':
          return res.status(400).json({ message: error.message });
        case 'Commentaire non trouvé':
          return res.status(404).json({ message: error.message });
        case 'Maximum 4 médias par commentaire':
          return res.status(400).json({ message: error.message });
        case 'Format de médias invalide':
          return res.status(400).json({ message: error.message });
        case 'Maximum 4 médias par commentaire':
          return res.status(400).json({ message: error.message });
        case 'Non autorisé à modifier ce commentaire':
          return res.status(403).json({ message: error.message });
        default:
          return res.status(500).json({ message: 'Erreur serveur', error: error.message });
      }
    }
  }
});

export default router;
