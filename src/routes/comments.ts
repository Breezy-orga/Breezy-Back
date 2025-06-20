import express, { Request, Response } from 'express';
import Comment from '../models/Comment';
import Post from '../models/Post';
import authMiddleware from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// Ajouter ou retirer un like sur un commentaire
router.post('/:id/like', authMiddleware, async (req: Request & { user?: { id: string } }, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'ID de commentaire invalide' });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Commentaire non trouvé' });
    }

    // Vérifier si l'utilisateur a déjà liké ce commentaire
    const isLiked = comment.likes.some(like => 
      like.toString() === userId
    );

    if (isLiked) {
      // Retirer le like
      await Comment.findByIdAndUpdate(commentId, {
        $pull: { likes: userId }
      });
      
      res.json({ liked: false, likesCount: comment.likes.length - 1 });
    } else {
      // Ajouter le like
      await Comment.findByIdAndUpdate(commentId, {
        $addToSet: { likes: userId }
      });
      
      res.json({ liked: true, likesCount: comment.likes.length + 1 });
    }
  } catch (error) {
    console.error('Erreur lors du like/unlike du commentaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour le schéma Comment pour inclure des médias (images)
router.post('/:id/media', authMiddleware, async (req: Request & { user?: { id: string } }, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = req.user?.id;
    const { media } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'ID de commentaire invalide' });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Commentaire non trouvé' });
    }

    // Vérifier si l'utilisateur est l'auteur du commentaire
    if (comment.author.toString() !== userId) {
      return res.status(403).json({ message: 'Non autorisé à modifier ce commentaire' });
    }

    // Limiter à 4 médias maximum comme pour les posts
    if (Array.isArray(media) && media.length > 4) {
      return res.status(400).json({ message: 'Maximum 4 médias par commentaire' });
    }
    
    // Validation du format des médias
    if (!Array.isArray(media) || !media.every(m => m.base64 && m.contentType)) {
      return res.status(400).json({ message: 'Format de médias invalide' });
    }

    // Mise à jour du commentaire avec les médias
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { $set: { media: media } },
      { new: true }
    );

    res.json({
      message: 'Médias ajoutés au commentaire avec succès',
      comment: updatedComment
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de médias au commentaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
