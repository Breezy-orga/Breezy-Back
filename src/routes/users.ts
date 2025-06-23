import express, { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth';
import User from '../models/User';
import mongoose from 'mongoose';
import { userService } from '../services/userService';

const router = express.Router();


class UsersRoutes {
  constructor() {
    this.routes();
  }

  private routes() {

/**
   * @swagger
   * /api/users/all:
   *   get:
   *     summary: Get all users
   *     tags: [User]
   *     responses:
   *       200:
   *         description: Users retrieved successfully

   *       500:
   *         description: Server error
   */
   router.get('/all', async (req: Request, res: Response) => {
    try {
      console.log('Fetching all users');
      const users = await userService.getAllUsers();
      res.json(users);
    } catch (error) {
      if (error instanceof Error && error.message === 'Failed to fetch users') {
        return res.status(500).json({ message: error.message });
      }
      if (error instanceof Error && error.message === 'No users found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to fetch users', error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * @swagger
   * /api/users/me:
   *   get:
   *     summary: get current user profile
   *     tags: [User]
   *     responses:
   *       200:
   *         description: Connexion réussie
   *       400:
   *         description: Paramètres invalides
   *       401:
   *         description: Identifiants invalides
   *       500:
   *         description: Erreur serveur
   */
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



  /**
   * @swagger
   * /api/users/me:
   *   put:
   *     summary: Update user profile
   *     tags: [User]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Connexion réussie
   *       400:
   *         description: Paramètres invalides
   *       401:
   *         description: Identifiants invalides
   *       500:
   *         description: Erreur serveur
   */
  router.put('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }
      
      const { username, bio, profilePicture } = req.body;
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (username) user.username = username;
      if (bio) user.bio = bio;
      if (profilePicture) user.profilePicture = profilePicture;

      await user.save();
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * @swagger
   * /api/users/search:
   *   get:
   *     summary: user Research
   *     tags: [User]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Connexion réussie
   *       400:
   *         description: Paramètres invalides
   *       401:
   *         description: Identifiants invalides
   *       500:
   *         description: Erreur serveur
   */
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



  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     summary: Get user by ID
   *     tags: [User]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: User ID
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Connexion réussie
   *       400:
   *         description: Paramètres invalides
   *       401:
   *         description: Identifiants invalides
   *       500:
   *         description: Erreur serveur
   */
  router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
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




  /**
   * @swagger
   * /api/follow/{id}:
   *   post:
   *     summary: Follow user
   *     tags: [User]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: User ID to follow
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User followed successfully
   *       400:
   *         description: Invalid parameters
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
   router.post('/follow/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }
      
      const userToFollow = await User.findById(req.params.id);
      const currentUser = await User.findById(req.user.userId);

      if (!userToFollow || !currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (currentUser.following.some(id => id.toString() === req.params.id)) {
        return res.status(400).json({ message: 'Already following this user' });
      }

      currentUser.following.push(new mongoose.Types.ObjectId(req.params.id));
      userToFollow.followers.push(new mongoose.Types.ObjectId(req.user.userId));

      await currentUser.save();
      await userToFollow.save();

      res.json({ message: 'User followed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
  });



  /**
   * @swagger
   * /api/unfollow/{id}:
   *   post:
   *     summary: Unfollow user
   *     tags: [User]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: User ID to unfollow
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User unfollowed successfully
   *       400:
   *         description: Invalid parameters
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
   router.post('/unfollow/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }
      
      const userToUnfollow = await User.findById(req.params.id);
      const currentUser = await User.findById(req.user.userId);

      if (!userToUnfollow || !currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!currentUser.following.some(id => id.toString() === req.params.id)) {
        return res.status(400).json({ message: 'Not following this user' });
      }

      currentUser.following = currentUser.following.filter(
        id => id.toString() !== req.params.id
      );
      userToUnfollow.followers = userToUnfollow.followers.filter(
        id => id.toString() !== req.user!.userId
      );

      await currentUser.save();
      await userToUnfollow.save();

      res.json({ message: 'User unfollowed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
  });



  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Connexion utilisateur
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Connexion réussie
   *       400:
   *         description: Paramètres invalides
   *       401:
   *         description: Identifiants invalides
   *       500:
   *         description: Erreur serveur
   */
  // Obtenir le profil d'un utilisateur
   router.get('/authenticate/:userId', authMiddleware, async (req: Request, res: Response) => {
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



  /**
   * @swagger
   * /api/profile:
   *   put:
   *     summary: Update user profile
   *     tags: [User]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Connexion réussie
   *       400:
   *         description: Paramètres invalides
   *       401:
   *         description: Identifiants invalides
   *       500:
   *         description: Erreur serveur
   */
   router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }
      
      const user = await userService.updateProfile(req.user.userId, req.body);      
      
      await user.save();
      res.json(user);
    } catch (error) {
      res.status(500).json({ 
        message: 'Erreur lors de la mise à jour du profil', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });



  /**
   * @swagger
   * /api/{userId}/follow:
   *   post:
   *     summary: follow/unfollow user
   *     tags: [User]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         description: User ID to follow/unfollow
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Connexion réussie
   *       400:
   *         description: Paramètres invalides
   *       401:
   *         description: Identifiants invalides
   *       500:
   *         description: Erreur serveur
   */
  // Suivre/Ne plus suivre un utilisateur
   router.post('/:userId/follow', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }
      const { currentUser, userToFollow } = await userService.followUser(req.user.userId, req.params.userId);

      await currentUser.save();
      await userToFollow.save();

      res.json({ following: !await userService.isFollowing(req.user.userId, req.params.userId) ? 'followed' : 'unfollowed' });
    } catch (error) {
      res.status(500).json({ 
        message: 'Erreur lors du follow/unfollow', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });



  /**
   * @swagger
   * /api/suggestions:
   *   get:
   *     summary: obtain user suggestions
   *     tags: [User] 
   *     responses:
   *       200:
   *         description: Suggestions retrieved successfully
   *       400:
   *         description: Invalid parameters
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  // Obtenir les suggestions d'utilisateurs
   router.get('/suggestions', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }
      
      const users = await userService.getSuggestions(req.user.userId);

      res.json(users);
    } catch (error) {
      res.status(500).json({ 
        message: 'Erreur lors de la récupération des suggestions', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });




  /**
   * @swagger
   * /api/preferences/theme:
   *   get:
   *     summary: Obtain user theme preferences
   *     tags: [User]
   *     responses:
   *       200:
   *         description: Theme preferences retrieved successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   *       500:
   *         description: Server error
   */
  
   router.get('/preferences/theme', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }
      const user = await userService.getTheme(req.user?.userId);
      // Retourne l'attribut theme de l'utilisateur ou 'light' par défaut
      res.json({ theme: user.theme || 'light' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Utilisateur non trouvé') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ 
        message: 'Erreur lors de la récupération des préférences de thème', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });



  /**
   * @swagger
   * /api/auth/login:
   *   put:
   *     summary: update user theme preferences
   *     tags: [User]
   *     requestBody: 
   *      required: true
   *      content:
   *        application/json:
   *         schema:
   *          type: object
   *         properties:
   *          theme:
   *           type: string
   *          enum: [light, dark]
   *     responses:
   *       200:
   *         description: Theme preferences updated successfully
   *       400:
   *         description: Invalid parameters
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  // Mettre à jour les préférences de thème de l'utilisateur
   router.put('/preferences/theme', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }
      const { theme } = req.body;

      const user = await userService.changeTheme(req.user.userId, theme);
      
      
      res.json({ theme: user.theme });
    } catch (error) {
      if (error instanceof Error && error.message === 'Le thème doit être "light" ou "dark"') {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof Error && error.message === 'Utilisateur non trouvé') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ 
        message: 'Erreur lors de la mise à jour du thème', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  


  }
}


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
  console.log(`DEBUG: Accès à l'endpoint utilisateur (/:userId) - userId=${req.params.userId}`);
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('followers', 'username name profilePicture')
      .populate('following', 'username name profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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

new UsersRoutes(); 
export default router;