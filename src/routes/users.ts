import express, { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth';
import User from '../models/User';
import mongoose from 'mongoose';
import { userService } from '@/services/userService';

class UsersRoutes {
  public router: Router;

  constructor() {
    this.router = express.Router();
    this.routes();
  }

  private routes() {


  /**
   * @swagger
   * /api/user/me:
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
  this.router.get('/me', authMiddleware, async (req: Request, res: Response) => {
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
   * /api/user/me:
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
  this.router.put('/me', authMiddleware, async (req: Request, res: Response) => {
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
   * /api/user/{id}:
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
  this.router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
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
  this.router.post('/follow/:id', authMiddleware, async (req: Request, res: Response) => {
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
  this.router.post('/unfollow/:id', authMiddleware, async (req: Request, res: Response) => {
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
  this.router.get('/:userId', authMiddleware, async (req: Request, res: Response) => {
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
  this.router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
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
  this.router.post('/:userId/follow', authMiddleware, async (req: Request, res: Response) => {
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
  this.router.get('/suggestions', authMiddleware, async (req: Request, res: Response) => {
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
  
  this.router.get('/preferences/theme', authMiddleware, async (req: Request, res: Response) => {
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
  this.router.put('/preferences/theme', authMiddleware, async (req: Request, res: Response) => {
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
  this.router.get('/all', async (req: Request, res: Response) => {
    try {
      console.log('Fetching all users');
      const users = await userService.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch users', error: error instanceof Error ? error.message : String(error) });
    }
  });


  }
}

const usersRoutes = new UsersRoutes();
export default usersRoutes.router;