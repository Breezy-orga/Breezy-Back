import express, { Request, Response, Router } from 'express';
import authMiddleware from '../../middleware/auth';
import User from '../../models/User';
import mongoose from 'mongoose';
import { userService } from '../../services/userService';

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

    // Recherche leselect('_id users utilisateurs par username qui contient la requête (insensible à la casse)
    // Exclut l'utilisateur actuel des résultats
    const users = await userService.getUserByUsernamesUnlessIds([query], [req.user.userId]);
    // Take name, profilePicture, and bio of the first 20 users
    const limitedUsers = users.slice(0, 20).map(user => ({
      _id: user._id,
      username: user.username,
      profilePicture: user.profilePicture,
      bio: user.bio
    }));

    res.json(limitedUsers);
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
      const user = await userService.getUserById(req.params.id)
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
      
      const newFollow = await userService.followUser(req.user.userId, req.params.id);

      if (!newFollow) {
        return res.status(400).json({ message: 'Unable to follow user' });
      }
      res.json({ message: 'User followed successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === "you can't follow yourself") {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ message: error.message });
      }
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
      const unfollowed = await userService.unfollowUser(req.user.userId, req.params.id);
      if (!unfollowed) {
        return res.status(400).json({ message: 'Unable to unfollow user' });
      }

      res.json({ message: 'User unfollowed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
  });



  /**
   * @swagger
   * /api/authenticate/:userId:
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
      const selection = '-password -__v'; // Sélection des champs à exclure
      const populate = ['posts', 'comments', 'likes']; // Champs à peupler
      const user = await userService.getUserByIdSelectAndPopulate(req.params.userId, selection, populate);

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
  }
}


new UsersRoutes(); 
export default router;