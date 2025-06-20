import express, { Request, Response } from 'express';
import Post from '../models/Post';
import User from '../models/User';
import Notification from '../models/Notification';
import authMiddleware from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// Créer un nouveau post
router.post('/', authMiddleware, express.json({limit: '50mb'}), async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const { content = '', parentPost, media = [], tags = [] } = req.body;
    
    // Validation minimale du contenu
    if (!content && media.length === 0) {
      return res.status(400).json({ message: 'Le post doit contenir du texte ou au moins un média' });
    }
    
    // Validation des médias
    let mediaArray = [];
    if (Array.isArray(media)) {
      mediaArray = media;
    } else if (media) {
      // S'il n'est pas un tableau mais existe, on le met dans un tableau
      mediaArray = [media];
    }
    
    // Créer le post avec le contenu et éventuellement les médias et tags
    const post = new Post({
      content,
      author: req.user?.userId,
      parentPost: parentPost || null,
      isComment: !!parentPost,
      media: mediaArray,
      commentsCount: 0,
      tags: Array.isArray(tags) ? tags : []
    });

    try {
      await post.save();
      await post.populate('author', 'username profilePicture');
    } catch (saveError) {
      console.error('Erreur lors de la sauvegarde du post:', saveError);
      return res.status(500).json({ 
        message: 'Erreur lors de la sauvegarde du post', 
        error: saveError instanceof Error ? saveError.message : String(saveError)
      });
    }
    
    // Si c'est un commentaire, incrémenter le compteur du post parent
    if (parentPost) {
      await Post.findByIdAndUpdate(parentPost, { $inc: { commentsCount: 1 } });
    }
    
    // Détecter les mentions (@username) et créer des notifications
    try {
      if (content && content.trim().length > 0) {
        // Trouver tous les @username dans le contenu (expression régulière améliorée)
        const mentions = content.match(/@([\w.-]+)/g);
        
        console.log('Mentions détectées:', mentions);
        
        if (mentions && mentions.length > 0) {
          // Extraire les noms d'utilisateur sans le @
          const usernames = mentions.map((mention: string) => mention.substring(1));
          
          console.log('Usernames extraits:', usernames);
          
          // Trouver les utilisateurs correspondants
          const mentionedUsers = await User.find({
            username: { $in: usernames },
            _id: { $ne: req.user?.userId } // Exclure l'auteur du post
          });
          
          console.log('Utilisateurs trouvés:', mentionedUsers.map(u => u.username));
          
          if (mentionedUsers.length > 0) {
            // Créer une notification pour chaque utilisateur mentionné
            const notificationPromises = mentionedUsers.map(user => {
              const notification = new Notification({
                recipient: user._id,
                sender: req.user?.userId || '',
                type: 'mention',
                post: post._id,
                read: false
              });
              
              return notification.save();
            });
            
            await Promise.all(notificationPromises);
            console.log(`${notificationPromises.length} notifications créées pour les mentions`);
          } else {
            console.log('Aucun utilisateur trouvé pour les mentions:', usernames);
          }
        } else {
          console.log('Aucune mention détectée dans:', content);
        }
      } else {
        console.log('Post sans contenu textuel, pas de vérification de mentions');
      }
    } catch (mentionError) {
      // Ne pas bloquer la création du post si la gestion des mentions échoue
      console.error('Erreur lors du traitement des mentions:', mentionError);
      // Continuer l'exécution sans renvoyer d'erreur
    }

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

// Rechercher des posts par tags
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
