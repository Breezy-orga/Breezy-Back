import express, { Request, Response } from 'express';
import Post from '../models/Post';
import User from '../models/User';
import authMiddleware from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// Créer un nouveau post
router.post('/', authMiddleware, express.json({limit: '16mb'}), async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const { content, parentPost, media } = req.body;
    
    // Validation minimale du contenu
    if (!content && (!media || !media.length)) {
      return res.status(400).json({ message: 'Le post doit contenir du texte ou au moins un média' });
    }
    
    // Créer le post avec le contenu et éventuellement les médias
    const post = new Post({
      content,
      author: req.user.userId,
      parentPost: parentPost || null,
      isComment: !!parentPost,
      media: media || []
    });

    await post.save();
    await post.populate('author', 'username profilePicture');

    res.status(201).json(post);
  } catch (error) {
    console.error('Erreur création post:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la création du post', 
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

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // S'assurer que following existe et est un array
    const following = user.following || [];
    
    const posts = await Post.find({
      author: { $in: [...following, req.user.userId] },
      isComment: false
    })
    .populate('author', 'username profilePicture')
    .populate('likes', 'username')
    .sort({ createdAt: -1 })
    .limit(20);
    
    // Log pour débug
    console.log(`Feed - ${posts.length} posts trouvés`);
    
    // Vérifier si les posts ont des médias
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

// Liker/Unliker un post
router.post('/:postId/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post non trouvé' });
    }

    const userId = req.user!.userId;
    const likeIndex = post.likes.findIndex(id => id.toString() === userId);
    
    if (likeIndex === -1) {
      post.likes.push(new mongoose.Types.ObjectId(userId));
    } else {
      post.likes.splice(likeIndex, 1);
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

    await Post.deleteOne({ _id: post._id });
    res.json({ message: 'Post supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du post', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

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
