import express, { Request, Response } from 'express';
import Post from '../models/Post';
import User from '../models/User';
import Notification from '../models/Notification';
import authMiddleware from '../middleware/auth';
import mongoose from 'mongoose';
import { PostService } from '../services/postService';

const router = express.Router();

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
      return res.status(500).json({ message: "500 post" });
    }
    console.error('Erreur lors de la création du post:', error);
    res.status(500).json({
      message: 'Erreur lors de la création du post',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

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
    interface PostQuery { isComment: boolean; author?: { $in: any[] } }
    const onlyFollowing = req.query.following === 'true';
    let query: PostQuery = { isComment: false };
    if (onlyFollowing) {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
      const following = user.following || [];
      if (following.length === 0) return res.json([]);
      query = { isComment: false, author: { $in: following } };
      console.log('Filtre par abonnements actif:', query);
    } else {
      console.log('Flux complet (tous les posts) demandé');
    }
    const posts = await Post.find(query)
      .populate('author', 'username profilePicture')
      .populate('media', 'base64 contentType alt')  // media
      .populate('likes', 'username')
      .sort({ createdAt: -1 })
      .limit(50);
    console.log(`Feed - ${posts.length} posts trouvés`);
    posts.forEach((post, index) => {
      if (post.media && post.media.length > 0) {
        console.log(`Post ${index}: ${post.media.length} médias trouvés`);
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

// Obtenir les posts d'un utilisateur
router.get('/user/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const posts = await Post.find({ author: req.params.userId, isComment: false })
      .populate('author', 'username profilePicture')
      .populate('media', 'base64 contentType alt')  // media
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

// Recherche de tags
router.get('/tags/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('Route /tags/search appelée');
    
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const { q } = req.query;
    console.log('Paramètre q reçu:', q);
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Paramètre de recherche "q" requis' });
    }

    const query = q.trim();
    if (query.length < 2) {
      return res.status(400).json({ message: 'La recherche doit contenir au moins 2 caractères' });
    }

    console.log('Recherche de tags pour:', query);

    // Approche simplifiée - récupérer tous les posts avec tags
    const postsWithTags = await Post.find({ 
      tags: { $exists: true, $ne: [] },
      isComment: false 
    }).select('tags');
    
    console.log('Posts trouvés avec tags:', postsWithTags.length);
    
    // Extraire tous les tags et filtrer côté JavaScript
    const allTags = postsWithTags.flatMap(p => p.tags);
    console.log('Tous les tags extraits:', allTags);
    
    // Filtrer les tags qui matchent la recherche (insensible à la casse)
    const matchingTags = allTags.filter(tag => 
      tag.toLowerCase().includes(query.toLowerCase())
    );
    
    console.log('Tags qui matchent:', matchingTags);
    
    // Éliminer les doublons
    const uniqueTags = [...new Set(matchingTags)];
    
    console.log('Tags uniques retournés:', uniqueTags);
    
    // Ajouter headers pour éviter le cache
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json(uniqueTags);
  } catch (error) {
    console.error('Erreur recherche tags:', error);
    res.status(500).json({
      message: 'Erreur lors de la recherche de tags',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Recherche de posts par tags
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('Route /search appelée');
    
    if (!req.user?.userId) return res.status(401).json({ message: 'Utilisateur non authentifié' });
    const { tags } = req.query;
    if (!tags || typeof tags !== 'string') return res.status(400).json({ message: 'Paramètre de recherche "tags" requis' });
    const tagArray = (tags as string).split(/[\s,]+/).map(tag => tag.replace(/^#/, '').trim()).filter(tag => tag.length > 0);
    if (!tagArray.length) return res.status(400).json({ message: 'Au moins un tag valide est requis' });
    const posts = await Post.find({ tags: { $in: tagArray }, isComment: false })
      .populate('author', 'username profilePicture')
      .populate('media', 'base64 contentType alt')  // media
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

// Liker/Unliker un post
router.post(
  '/:postId/like',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ message: 'Utilisateur non authentifié' });
      }

      // On ne populate plus (pas utile pour le toggle/count)
      const post = await Post.findById(req.params.postId);
      if (!post) {
        return res.status(404).json({ message: 'Post non trouvé' });
      }

      // Détermine si on ajoute ou retire
      let liked: boolean;
      const userObjId = new mongoose.Types.ObjectId(userId);
       if (post.likes.some((id) => id.equals(userObjId))) {
        // déjà liké → on unlikera via filter
        post.likes = post.likes.filter((id) => !id.equals(userObjId));
        liked = false;
      } else {
        // pas encore liké → on likera
        post.likes.push(userObjId);
        liked = true;

        // Notification uniquement à la première mise de like
        if (post.author.toString() !== userId) {
          const notifExists = await Notification.findOne({
            recipient: post.author,
            sender: userId,
            type: 'like',
            post: post._id,
          });
          if (!notifExists) {
            await Notification.create({
              recipient: post.author,
              sender: userId,
              type: 'like',
              post: post._id,
              read: false,
            });
          }
        }
      }

      await post.save();

      // Renvoi minimal pour mise à jour front
      return res.status(200).json({
        liked,
        totalLikes: post.likes.length,
      });
    } catch (error) {
      console.error('Erreur like/unlike:', error);
      return res.status(500).json({
        message: 'Erreur lors du like/unlike',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Obtenir les commentaires d'un post
router.get('/:postId/comments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const comments = await Post.find({ parentPost: req.params.postId, isComment: true })
      .populate('author', 'username profilePicture')
      .populate('media', 'base64 contentType alt')  // media
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

// Récupérer un post ou commentaire par son id
router.get('/:postId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username profilePicture')
      .populate('media', 'base64 contentType alt')  // media
      .populate('likes', 'username');
    if (!post) return res.status(404).json({ message: 'Post ou commentaire non trouvé' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du post/commentaire', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;