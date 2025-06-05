const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Créer un nouveau post
router.post('/', auth, async (req, res) => {
  try {
    const { content, parentPost } = req.body;
    const post = new Post({
      content,
      author: req.user.userId,
      parentPost: parentPost || null,
      isComment: !!parentPost
    });

    await post.save();
    await post.populate('author', 'username name profilePicture');

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création du post', error: error.message });
  }
});

// Obtenir le flux d'actualités
router.get('/feed', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const posts = await Post.find({
      author: { $in: [...user.following, req.user.userId] },
      isComment: false
    })
    .populate('author', 'username name profilePicture')
    .populate('likes', 'username')
    .sort({ createdAt: -1 })
    .limit(20);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du flux', error: error.message });
  }
});

// Obtenir les posts d'un utilisateur
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const posts = await Post.find({
      author: req.params.userId,
      isComment: false
    })
    .populate('author', 'username name profilePicture')
    .populate('likes', 'username')
    .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des posts', error: error.message });
  }
});

// Liker/Unliker un post
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post non trouvé' });
    }

    const likeIndex = post.likes.indexOf(req.user.userId);
    if (likeIndex === -1) {
      post.likes.push(req.user.userId);
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du like/unlike', error: error.message });
  }
});

// Obtenir les commentaires d'un post
router.get('/:postId/comments', auth, async (req, res) => {
  try {
    const comments = await Post.find({
      parentPost: req.params.postId,
      isComment: true
    })
    .populate('author', 'username name profilePicture')
    .populate('likes', 'username')
    .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des commentaires', error: error.message });
  }
});

// Supprimer un post
router.delete('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post non trouvé' });
    }

    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Non autorisé à supprimer ce post' });
    }

    await post.remove();
    res.json({ message: 'Post supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du post', error: error.message });
  }
});

// Ajouter la route pour obtenir un post ou commentaire par son id
router.get('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username name profilePicture')
      .populate('likes', 'username');
    if (!post) {
      return res.status(404).json({ message: 'Post ou commentaire non trouvé' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du post/commentaire', error: error.message });
  }
});

module.exports = router; 