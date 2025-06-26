import express, { Request, Response } from 'express';
import Post from '../models/Post';
import User from '../models/User';
import Notification from '../models/Notification';
import authMiddleware from '../middleware/auth';
import mongoose from 'mongoose';
import { PostService } from '../services/postService';

const router = express.Router();




/**
     * @swagger
     * /api/posts:
     *   post:
     *     summary: Créer un nouveau post
     *     tags: [Posts]
     *     responses:
     *       201:
     *         description: Post créé avec succès
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors de la création du post
     */
// Créer un nouveau post
router.post('/', authMiddleware, express.json({limit: '50mb'}), async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    const post = await PostService.createPost(req.body, req.user.userId);
    res.status(201).json(post);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Utilisateur non authentifié')) {
      return res.status(401).json({ message: error.message });
    }
    if (error instanceof Error && error.message.includes('Le post doit contenir du texte ou au moins un média')) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message.includes('Erreur lors de la sauvegarde du post')) {
      return res.status(500).json({ message: "500 post"/*error.message*/ });
    }
    console.error('Erreur lors de la création du post:', error);
    res.status(500).json({
      message: 'Erreur lors de la création du post',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});


/**
     * @swagger
     * /api/posts/feed:
     *   parameters:
     *     - in: path
     *       name: postId
     *       required: true
     *       description: ID du post à récupérer
     *       schema:
     *         type: string
     *   get:
     *     summary: Récupérer le fil d'actualités
     *     tags: [Posts]
     *     responses:
     *       200:
     *         description: Fil d'actualités récupéré avec succès
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors de la récupération du fil d'actualités
     */

// Supprimer un post
router.delete('/:postId', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    const result = await PostService.deletePost(req.params.postId, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du post', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});


// Obtenir le flux d'actualités
router.get('/feed', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    // Définir l'interface pour l'objet query pour éviter les erreurs TypeScript
    interface PostQuery {
      isComment: boolean;
      author?: { $in: any[] }; // Utilise any[] pour accepter à la fois ObjectId[] et string[]
    }
    
    // Vérifier si on ne veut que les posts des utilisateurs suivis
    const onlyFollowing = req.query.following === 'true';
    let query: PostQuery = { isComment: false };
    
    // Si on filtre par abonnements, construire une requête avec uniquement les utilisateurs suivis
    if (onlyFollowing) {
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      // S'assurer que following existe et est un array
      const following = user.following || [];
      
      if (following.length === 0) {
        // Si l'utilisateur ne suit personne, renvoyer un tableau vide
        return res.json([]);
      }
      
      // Uniquement les posts des utilisateurs suivis
      query = {
        isComment: false,
        author: { $in: following } // following est un ObjectId[] de Mongoose
      };
      
      console.log('Filtre par abonnements actif:', query);
    } else {
      console.log('Flux complet (tous les posts) demandé');
    }
    
    const posts = await Post.find(query)
    .populate('author', 'username profilePicture')
    .populate('likes', 'username')
    .sort({ createdAt: -1 })
    .limit(50);
    
    // Log pour débug
    console.log(`Feed - ${posts.length} posts trouvés`);
    
    // Vérifier si les posts ont des médias
    posts.forEach((post, index) => {
      if (post.medias && post.medias.length > 0) {
      console.log(`Post ${index}: ${post.medias.length} médias trouvés`);
      }
    });

    res.json(posts);
  } catch (error) {
    console.error('Erreur récupération feed:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du flux', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});



/**
     * @swagger
     * /api/posts/user/{userId}:
     *   parameters:
     *     - in: path
     *       name: userId
     *       required: true
     *       description: ID de l'utilisateur dont on veut récupérer les posts
     *       schema:
     *         type: string
     *   get:
     *     summary: Récupérer les posts d'un utilisateur
     *     tags: [Posts]
     *     responses:
     *       200:
     *         description: Posts récupérés avec succès
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors de la récupération des posts
     */

// Obtenir les posts d'un utilisateur
router.get('/user/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const posts = await Post.find({
      author: req.params.userId,
      isComment: false
    })
    .populate('author', 'username profilePicture')
    .populate('likes', 'username')
    .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des posts', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});


/**
     * @swagger
     * /api/posts/search:
     *   parameters:
     *     - in: query
     *       name: tags
     *       required: true
     *       description: Tags à rechercher
     *       schema:
     *         type: string
     *   get:
     *     summary: Research posts from tags
     *     tags: [Posts]
     *     responses:
     *       200:
     *         description: Posts retrieved successfully
     *       400:
     *         description: Bad request, missing parameters
     *       500:
     *         description: Error retrieving posts
     */
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const { tags } = req.query;

    if (!tags || typeof tags !== 'string') {
      return res.status(400).json({ message: 'Paramètre de recherche "tags" requis' });
    }

    // Séparer les tags par espaces, virgules ou hashtags
    const tagArray = tags.split(/[\s,]+/)
      .map(tag => tag.replace(/^#/, '').trim()) // Enlève les # au début et les espaces
      .filter(tag => tag.length > 0); // Filtre les tags vides

    if (tagArray.length === 0) {
      return res.status(400).json({ message: 'Au moins un tag valide est requis' });
    }

    const posts = await Post.find({
      tags: { $in: tagArray },
      isComment: false
    })
    .populate('author', 'username profilePicture')
    .populate('likes', 'username')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(posts);
  } catch (error) {
    console.error('Erreur recherche par tags:', error);
    res.status(500).json({
      message: 'Erreur lors de la recherche de posts par tags',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});


/**
     * @swagger
     * /api/posts/{postId}/like:
     *   parameters:
     *     - in: path
     *       name: postId
     *       required: true
     *       description: ID du post à liker
     *       schema:
     *         type: string
     *   post:
     *     summary: Liker un post
     *     tags: [Posts]
     *     responses:
     *       201:
     *         description: Post liké avec succès
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors du like du post
     */
// Liker/Unliker un post
router.post('/:postId/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const post = await Post.findById(req.params.postId).populate('author', '_id');
    if (!post) {
      return res.status(404).json({ message: 'Post non trouvé' });
    }

    const userId = req.user.userId;
    const likeIndex = post.likes.findIndex(id => id.toString() === userId);
    
    if (likeIndex === -1) {
      // Ajouter le like
      post.likes.push(new mongoose.Types.ObjectId(userId));
      
      // Créer une notification pour l'auteur du post (sauf si c'est son propre post)
      if (post.author && post.author._id && post.author._id.toString() !== userId) {
        const notificationExists = await Notification.findOne({
          recipient: post.author._id,
          sender: userId,
          type: 'like',
          post: post._id
        });

        // Ne crée la notification que si elle n'existe pas déjà
        if (!notificationExists) {
          const notification = new Notification({
            recipient: post.author._id,
            sender: userId,
            type: 'like',
            post: post._id,
            read: false,
          });
          await notification.save();
          console.log(`Notification de like créée: ${userId} -> ${post.author._id}`);
        }
      }
    } else {
      // Retirer le like
      post.likes.splice(likeIndex, 1);
      
      // Si on veut, on peut supprimer la notification quand on unlike
      // await Notification.findOneAndDelete({
      //   recipient: post.author._id,
      //   sender: userId,
      //   type: 'like',
      //   post: post._id
      // });
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors du like/unlike', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});



/**
     * @swagger
     * /api/posts/{postId}/comments:
     *   parameters:
     *     - in: path
     *       name: postId
     *       required: true
     *       description: ID du post dont on veut récupérer les commentaires
     *       schema:
     *         type: string
     *   get:
     *     summary: Récupérer les commentaires d'un post
     *     tags: [Posts]
     *     responses:
     *       200:
     *         description: Commentaires récupérés avec succès
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors de la récupération des commentaires
     */
// Obtenir les commentaires d'un post
router.get('/:postId/comments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const comments = await Post.find({
      parentPost: req.params.postId,
      isComment: true
    })
    .populate('author', 'username profilePicture')
    .populate('likes', 'username')
    .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des commentaires', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});



/**
     * @swagger
     * /api/posts/{postId}:
     *   parameters:
     *     - in: path
     *       name: postId
     *       required: true
     *       description: ID du post à supprimer
     *       schema:
     *         type: string
     *   delete:
     *     summary: Supprimer un post
     *     tags: [Posts]
     *     responses:
     *       201:
     *         description: Post supprimé avec succès
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors de la suppression du post
     */
// Supprimer un post
router.delete('/:postId', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post non trouvé' });
    }

    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Non autorisé à supprimer ce post' });
    }

    // Si c'est un commentaire, décrémenter le compteur du post parent
    if (post.isComment && post.parentPost) {
      await Post.findByIdAndUpdate(post.parentPost, { $inc: { commentsCount: -1 } });
    }
    
    await Post.deleteOne({ _id: post._id });
    res.json({ message: 'Post supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du post', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});



/**
     * @swagger
     * /api/posts/{postId}:
     *   parameters:
     *     - in: path
     *       name: postId
     *       required: true
     *       description: ID du post à récupérer
     *       schema:
     *         type: string
     *   get:
     *     summary: Récupérer un post par son ID
     *     tags: [Posts]
     *     responses:
     *       200:
     *         description: Post récupéré avec succès
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors de la récupération du post
     */
// Ajouter la route pour obtenir un post ou commentaire par son id
router.get('/:postId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username profilePicture')
      .populate('likes', 'username');
      
    if (!post) {
      return res.status(404).json({ message: 'Post ou commentaire non trouvé' });
    }
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du post/commentaire', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
