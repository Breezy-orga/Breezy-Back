import express, { Request, Response } from 'express';
import Comment from '../models/Comment';
import Post from '../models/Post';
import authMiddleware from '../middleware/auth';
<<<<<<< Updated upstream
=======
import { PostCommentService } from '../services/postCommentService';
import Post from '../models/Post';
import Notification from '../models/Notification';
>>>>>>> Stashed changes
import mongoose from 'mongoose';

const router = express.Router();

// Ajouter ou retirer un like sur un commentaire
<<<<<<< Updated upstream
router.post('/:id/like', authMiddleware, async (req: Request & { user?: { id: string } }, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
=======
router.post('/:id/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = (req.user as any)?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    // Récupérer le commentaire (qui est un Post avec isComment: true)
    const comment = await Post.findOne({ 
      _id: commentId, 
      isComment: true 
    }).populate('author', 'username profilePicture displayName isVerified');
    
    if (!comment) {
      return res.status(404).json({ message: 'Commentaire non trouvé' });
    }

    const likeIndex = comment.likes.findIndex(id => id.toString() === userId);
    
    if (likeIndex === -1) {
      // Ajouter le like
      comment.likes.push(new mongoose.Types.ObjectId(userId));
      
      // Créer une notification pour l'auteur du commentaire (sauf si c'est son propre commentaire)
      if (comment.author && comment.author._id && comment.author._id.toString() !== userId) {
        const notificationExists = await Notification.findOne({
          recipient: comment.author._id,
          sender: userId,
          type: 'like',
          post: comment._id
        });

        // Ne crée la notification que si elle n'existe pas déjà
        if (!notificationExists) {
          const notification = new Notification({
            recipient: comment.author._id,
            sender: userId,
            type: 'like',
            post: comment._id,
            read: false,
          });
          await notification.save();
          console.log(`Notification de like sur commentaire créée: ${userId} -> ${comment.author._id}`);
        }
      }
    } else {
      // Retirer le like
      comment.likes.splice(likeIndex, 1);
    }

    await comment.save();
    
    // Re-populate le commentaire avec toutes les informations nécessaires pour le frontend
    const populatedComment = await Post.findById(comment._id)
      .populate('author', 'username profilePicture displayName isVerified')
      .populate('likes', 'username');
    
    // Ajouter le statut isLiked pour l'utilisateur connecté
    const commentObj = populatedComment?.toObject();
    if (commentObj) {
      (commentObj as any).isLiked = populatedComment ? populatedComment.likes.some((like: any) => like._id.toString() === userId) : false;
    }
    
    res.json(commentObj);
  } catch (error) {
    console.error('Error in POST /api/comments/:id/like', error);
    if (error instanceof Error) {
      return res.status(500).json({ 
        message: 'Erreur lors du traitement du like',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
// Mettre à jour le schéma Comment pour inclure des médias (images)
=======
// Supprimer un commentaire
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = (req.user as any)?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    // Récupérer le commentaire (qui est un Post avec isComment: true)
    const comment = await Post.findOne({ 
      _id: commentId, 
      isComment: true 
    });
    
    if (!comment) {
      return res.status(404).json({ message: 'Commentaire non trouvé' });
    }

    // Vérifier que l'utilisateur est l'auteur du commentaire
    if (comment.author.toString() !== userId) {
      return res.status(403).json({ message: 'Non autorisé à supprimer ce commentaire' });
    }

    // Supprimer le commentaire
    await Post.findByIdAndDelete(commentId);
    
    res.json({ message: 'Commentaire supprimé avec succès' });
  } catch (error) {
    console.error('Error in DELETE /api/comments/:id', error);
    if (error instanceof Error) {
      return res.status(500).json({ 
        message: 'Erreur lors de la suppression du commentaire',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// Ajouter des médias à un commentaire
// TODO: Implémenter la fonctionnalité d'ajout de médias pour les commentaires
>>>>>>> Stashed changes
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
