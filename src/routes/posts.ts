import express, { Request, Response } from 'express';
import Post from '../models/Post';
import User from '../models/User';
import Notification from '../models/Notification';
import authMiddleware from '../middleware/auth';
import mongoose from 'mongoose';
<<<<<<< Updated upstream

const router = express.Router();

=======
import { PostService } from '../services/postService';
import { MediaService } from '../services/mediaService';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Liste des types MIME acceptés pour les médias
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg'
];



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
>>>>>>> Stashed changes
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
    console.log(`Récupération des posts pour l'utilisateur: ${req.params.userId}`);
    
    // Gestion spéciale de "me" pour référer à l'utilisateur authentifié
    let authorId = req.params.userId;
    if (authorId === 'me' && req.user?.userId) {
      authorId = req.user.userId;
      console.log(`"me" résolu vers l'ID: ${authorId}`);
    }
    
    // Vérifier que l'ID est au bon format
    if (authorId !== 'me' && !mongoose.isValidObjectId(authorId)) {
      console.error(`ID utilisateur invalide: ${authorId}`);
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }
    
    const query = {
      author: authorId,
      isComment: false
    };
    
    console.log('Exécution de la requête:', JSON.stringify(query));
    
    const posts = await Post.find(query)
      .populate('author', 'username profilePicture')
      .populate('likes', 'username')
      .sort({ createdAt: -1 });

    console.log(`${posts.length} posts trouvés pour l'utilisateur ${authorId}`);
    res.json(posts);
  } catch (error) {
    console.error('Erreur détaillée lors de la récupération des posts:', error);
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

    const post = await Post.findById(req.params.postId).populate('author', 'username profilePicture displayName isVerified');
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
    
    // Re-populate le post avec toutes les informations nécessaires pour le frontend
    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username profilePicture displayName isVerified')
      .populate('likes', 'username');
    
    res.json(populatedPost);
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
    const userId = (req.user as any)?.userId;
    
    const comments = await Post.find({
      parentPost: req.params.postId,
      isComment: true
    })
    .populate('author', 'username profilePicture displayName isVerified')
    .populate('likes', 'username')
    .sort({ createdAt: -1 });

    // Ajouter l'information isLiked pour chaque commentaire
    const commentsWithLikeStatus = comments.map(comment => {
      const commentObj = comment.toObject();
      (commentObj as any).isLiked = userId ? comment.likes.some((like: any) => like._id.toString() === userId) : false;
      return commentObj;
    });

    res.json(commentsWithLikeStatus);
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

// Modifier un post
router.put('/:postId', authMiddleware, express.json({limit: '50mb'}), async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const { content, media = [], tags = [] } = req.body;
    const postId = req.params.postId;

    // Vérification que le post existe
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post introuvable' });
    }

    // Vérification que l'utilisateur est l'auteur du post
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Vous n\'\u00eates pas autorisé à modifier ce post' });
    }

    // Validation minimale du contenu
    if (!content && media.length === 0) {
      return res.status(400).json({ message: 'Le post doit contenir du texte ou au moins un média' });
    }

    // Mise à jour du post
    post.content = content;
    post.media = media;
    post.tags = tags;
    post.updatedAt = new Date();

    await post.save();
    await post.populate('author', 'username profilePicture');

    console.log(`Post ${postId} modifié avec succès par l'utilisateur ${req.user.userId}`);
    res.json(post);
  } catch (error) {
    console.error('Erreur lors de la modification du post:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la modification du post', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Obtenir un post ou commentaire par son id
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

/**
 * @swagger
 * /api/posts/trending-hashtags:
 *   get:
 *     summary: Récupérer les hashtags tendance
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Hashtags tendance récupérés avec succès
 *       500:
 *         description: Erreur lors de la récupération des hashtags tendance
 */
// Obtenir les hashtags tendance
router.get('/trending-hashtags', async (req: Request, res: Response) => {
  try {
    // Agrégation pour compter les hashtags les plus populaires
    const trendingHashtags = await Post.aggregate([
      // Filtrer les posts (pas les commentaires) créés dans les derniers 7 jours
      {
        $match: {
          isComment: false,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 jours
          tags: { $exists: true, $ne: [] } // S'assurer que le champ tags existe et n'est pas vide
        }
      },
      // Décomposer le tableau de tags pour chaque post
      {
        $unwind: '$tags'
      },
      // Filtrer les tags vides
      {
        $match: {
          tags: { $ne: '' }
        }
      },
      // Grouper par tag et compter
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      // Trier par popularité décroissante
      {
        $sort: { count: -1 }
      },
      // Limiter aux 10 premiers
      {
        $limit: 10
      },
      // Reformater le résultat
      {
        $project: {
          _id: 0,
          hashtag: { 
            $cond: {
              if: { $regexMatch: { input: '$_id', regex: /^#/ } },
              then: '$_id',
              else: { $concat: ['#', '$_id'] }
            }
          },
          count: 1
        }
      }
    ]);

    // Si aucun hashtag trouvé, retourner des hashtags par défaut
    if (trendingHashtags.length === 0) {
      const defaultHashtags = [
        { hashtag: '#BreezyApp', count: 15 },
        { hashtag: '#SocialMedia', count: 12 },
        { hashtag: '#NextJS', count: 8 },
        { hashtag: '#TypeScript', count: 6 },
        { hashtag: '#WebDev', count: 4 }
      ];
      return res.json(defaultHashtags);
    }

    res.json(trendingHashtags);
  } catch (error) {
    console.error('Erreur récupération hashtags tendance:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des hashtags tendance', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Routes pour les médias (intégrées dans posts car liées aux posts)

/**
 * @swagger
 * /api/posts/media/upload:
 *   post:
 *     summary: Upload a media file (image or video in Base64)
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base64:
 *                 type: string
 *                 description: The Base64 encoded media file
 *               contentType:
 *                 type: string
 *                 description: The MIME type of the media file
 *     responses:
 *       200:
 *         description: Media uploaded successfully
 *       400:
 *         description: Invalid media type or missing fields
 *       500:
 *         description: Server error
 */
// Route pour uploader un média (image ou vidéo en Base64)
router.post('/media/upload', authMiddleware, express.json({limit: '16mb'}), async (req: Request, res: Response) => {
  try {
    const body = req.body
    MediaService.uploadMedia(body, ACCEPTED_IMAGE_TYPES, ACCEPTED_VIDEO_TYPES);
    // Génération du nom de fichier unique
    const filename = `${Date.now()}-${uuidv4().substring(0, 8)}`;
    console.log(`💥💥💥DEBUG: Upload de média - filename=${filename}, contentType=${req.body.contentType}`);
    // Retourne les informations nécessaires pour stocker dans un post
    res.json({
      filename,
      contentType: req.body.contentType,
      base64: req.body.base64,
      success: true
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'upload d\'image', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @swagger
 * /api/posts/media/{postId}/{mediaIndex}:
 *   get:
 *     summary: Get media from a post by index
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *       - in: path
 *         name: mediaIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: The media index in the post
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [raw, json]
 *         description: Response format (raw for binary data, json for metadata)
 *     responses:
 *       200:
 *         description: Media retrieved successfully
 *       400:
 *         description: Invalid post ID or media index
 *       404:
 *         description: Post not found or media not found at index
 *       500:
 *         description: Server error
 */
// Route pour récupérer un média par l'ID du post et l'index du média
router.get('/media/:postId/:mediaIndex', async (req: Request, res: Response) => {
  console.log(`DEBUG: Accès à l'endpoint média - postId=${req.params.postId}, mediaIndex=${req.params.mediaIndex}`);
  try {
    const postId = req.params.postId;
    const mediaIndex = parseInt(req.params.mediaIndex, 10);
    
    const result = await MediaService.getMediaByPostIdAndIndex(postId, mediaIndex, req, res);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'ID de post invalide':
          return res.status(400).json({ message: error.message });
        case 'Index de média invalide':
          return res.status(400).json({ message: error.message });
        case 'Post non trouvé':
          return res.status(404).json({ message: error.message });
        case 'Média non trouvé à l\'index spécifié':
          return res.status(404).json({ message: error.message });
        case 'Contenu base64 non trouvé':
          return res.status(404).json({ message: error.message });
        default:
          return res.status(500).json({ message: 'Erreur serveur', error: error.message });
      }
    }
  }
});

export default router;
