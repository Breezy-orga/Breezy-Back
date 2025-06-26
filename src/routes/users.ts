import express, { Request, Response } from 'express';
import authMiddleware from '../middleware/auth';
import User from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// Récupérer les abonnés d'un utilisateur
router.get('/:userId/followers', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('followers')
      .populate('followers', 'username profilePicture pseudonym');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ followers: user.followers });
  } catch (error) {
    console.error('Erreur lors de la récupération des abonnés:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des abonnés',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Récupérer les abonnements d'un utilisateur
router.get('/:userId/following', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('following')
      .populate('following', 'username profilePicture pseudonym');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ following: user.following });
  } catch (error) {
    console.error('Erreur lors de la récupération des abonnements:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des abonnements',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
  }
});

// Update user profile
router.put('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    const { username, bio, profilePicture, pseudonym } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) user.username = username;
    if (bio) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;
    if (pseudonym) user.pseudonym = pseudonym;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
  }
});

// Upload profile picture
router.post('/upload-profile-picture', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    const { profilePicture } = req.body;
    if (!profilePicture) {
      return res.status(400).json({ message: 'Profile picture is required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update profile picture with base64 string
    user.profilePicture = profilePicture;
    await user.save();
    
    res.json({
      success: true,
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({
      message: 'Server error while uploading profile picture',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Recherche d'utilisateurs
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Paramètre de recherche "query" requis' });
    }

    if (query.trim().length < 2) {
      return res.status(400).json({ message: 'La recherche doit contenir au moins 2 caractères' });
    }

    // Recherche les utilisateurs par username qui contient la requête (insensible à la casse)
    // Exclut l'utilisateur actuel des résultats
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user.userId }
    })
    .select('_id username profilePicture bio')
    .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Erreur recherche utilisateurs:', error);
    res.status(500).json({
      message: 'Erreur lors de la recherche d\'utilisateurs',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Suivre/Ne plus suivre un utilisateur (toggle)
// Utilise la route /:userId/follow (POST) plus bas

// Obtenir le profil d'un utilisateur
router.get('/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('followers', 'username name profilePicture')
      .populate('following', 'username name profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du profil', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Mettre à jour le profil
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    const { name, bio, profilePicture } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (name && 'name' in user) (user as any).name = name;
    if (bio) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du profil', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Suivre/Ne plus suivre un utilisateur
router.post('/:userId/follow', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    if (req.params.userId === req.user.userId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous suivre vous-même' });
    }

    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user.userId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const isFollowing = currentUser.following.some(id => id.toString() === req.params.userId);
    
    if (isFollowing) {
      // Ne plus suivre
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== req.params.userId
      );
      userToFollow.followers = userToFollow.followers.filter(
        id => id.toString() !== req.user!.userId
      );
    } else {
      // Suivre
      currentUser.following.push(new mongoose.Types.ObjectId(req.params.userId));
      userToFollow.followers.push(new mongoose.Types.ObjectId(req.user!.userId));
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({ following: !isFollowing });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors du follow/unfollow', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Obtenir les suggestions d'utilisateurs
router.get('/suggestions', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    const currentUser = await User.findById(req.user.userId);
    
    if (!currentUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    const users = await User.find({
      _id: {
        $nin: [...currentUser.following, req.user.userId]
      }
    })
    .select('username name profilePicture')
    .limit(5);

    res.json(users);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des suggestions', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Obtenir les préférences de thème de l'utilisateur
router.get('/preferences/theme', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Retourne l'attribut theme de l'utilisateur ou 'light' par défaut
    res.json({ theme: user.theme || 'light' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des préférences de thème', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Mettre à jour les préférences de thème de l'utilisateur
router.put('/preferences/theme', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    const { theme } = req.body;
    
    // Vérifier que le thème est valide
    if (theme !== 'light' && theme !== 'dark') {
      return res.status(400).json({ message: 'Le thème doit être "light" ou "dark"' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Mettre à jour le thème utilisateur
    user.theme = theme;
    await user.save();
    
    res.json({ theme: user.theme });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du thème', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Obtenir le profil d'un utilisateur (route générique - DOIT être placée à la fin)
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  console.log(`DEBUG: Accès à l'endpoint utilisateur (/:id) - id=${req.params.id}`);
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
  }
});

// Obtenir le profil d'un utilisateur (autre version générique - DOIT être placée à la fin également)
router.get('/:userId', authMiddleware, async (req: Request, res: Response) => {
  console.log(`[DEBUG][${new Date().toISOString()}] Accès à l'endpoint utilisateur (/:userId) - userId=${req.params.userId}`);
  console.log('[DEBUG] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('[DEBUG] User authentifié:', req.user);
  
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('followers', 'username name profilePicture')
      .populate('following', 'username name profilePicture');

    if (!user) {
      console.log(`[DEBUG] Utilisateur non trouvé: ${req.params.userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`[DEBUG] Utilisateur trouvé: ${user.username} (${user._id})`);
    console.log(`[DEBUG] Nombre de followers: ${user.followers?.length || 0}`);
    console.log(`[DEBUG] Nombre de following: ${user.following?.length || 0}`);

    // Augmenter le nombre de vues du profil
    user.profileViews = (user.profileViews || 0) + 1;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du profil', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
