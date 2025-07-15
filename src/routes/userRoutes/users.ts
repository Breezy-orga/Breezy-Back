import express, { Request, Response, Router } from 'express';
import authMiddleware from '../../middleware/auth';
import User from '../../models/User';
import mongoose from 'mongoose';
import { userService } from '../../services/userService';
import { NotificationHelper } from '../../utils/notificationHelper'; // Import ajouté

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
     *     summary: Get current user
     *     tags: [User]
     *     responses:
     *       200:
     *         description: User retrieved successfully
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Server error
     */
    router.get('/me', authMiddleware, async (req: Request, res: Response) => {
      try {
        if (!req.user?.userId) {
          return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }
        const user = await userService.getUserById(req.user.userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
      } catch (error) {
        res.status(500).json({ message: 'Erreur serveur', error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Delete a User (admin-only)
    router.delete('/:userId', authMiddleware, async (req: Request, res: Response) => {
      try {
        if (!req.user?.userId) {
          return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }
        // On ne peut pas supprimer un admin ou un modérateur
        const userToDelete = await User.findById(req.params.userId);
        if (!userToDelete) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        if (userToDelete.role === 'admin' || userToDelete.role === 'moderator') {
          return res.status(403).json({ message: 'Impossible de supprimer un compte admin ou modérateur.' });
        }

        // Seul un utilisateur peut supprimer son propre compte, ou un admin peut supprimer un autre (non admin/modo)
        if (req.user.userId !== req.params.userId) {
          const currentUser = await User.findById(req.user.userId);
          if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé : admin requis pour supprimer un autre compte.' });
          }
        }

        await userService.deleteUser(req.params.userId);

        if (req.user.userId === req.params.userId) {
          res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
          return res.json({ message: 'Utilisateur supprimé avec succès', redirect: '/login' });

        }
        res.json({ message: 'Utilisateur supprimé avec succès' });
      } catch (error) {
        res.status(500).json({
          message: 'Erreur lors de la suppression de l\'utilisateur',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    /**
     * @swagger
     * /api/users/search:
     *   get:
     *     summary: user Research
     *     tags: [User]
     *     responses:
     *       200:
     *         description: Users found successfully
     *       400:
     *         description: Invalid parameters
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Server error
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

        const users = await userService.getUserByUsernamesUnlessIds(query, [req.user.userId]);
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
     *         description: User retrieved successfully
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */
    router.get('/getById/:id', authMiddleware, async (req: Request, res: Response) => {
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
     * /api/authenticate/:userId:
     *   post:
     *     summary: Get user profile
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Profile retrieved successfully
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */
    // Obtenir le profil d'un utilisateur
    router.get('/authenticate/:userId', authMiddleware, async (req: Request, res: Response) => {
      try {
        const selection = '-password -__v';
        const populate: string[] = [];
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
     *               name:
     *                 type: string
     *               bio:
     *                 type: string
     *     responses:
     *       200:
     *         description: Profile updated successfully
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Server error
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

    router.get('/find-id-by-username/:username', authMiddleware, async (req: Request, res: Response) => {
      try {
        const { username } = req.params;
        if (!username) {
          return res.status(400).json({ message: 'Paramètre "username" requis' });
        }
        const user = await User.findOne({ username: username });
        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        res.json({ _id: user._id });
      } catch (error) {
        res.status(500).json({
          message: 'Erreur lors de la recherche par username',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    /**
     * @swagger
     * /api/{userId}/follow:
     *   post:
     *     summary: follow/unfollow user with notifications
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
     *         description: Follow/unfollow successful with notification
     *       400:
     *         description: Invalid parameters
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Server error
     */
    // Suivre/Ne plus suivre un utilisateur AVEC notifications
    router.post('/:userId/follow', authMiddleware, async (req: Request, res: Response) => {
      try {
        if (!req.user?.userId) {
          return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        console.log('=== DEBUG FOLLOW START ===');
        console.log('Current user ID:', req.user.userId);
        console.log('Target user ID:', req.params.userId);

        // Vérifier l'état avant le changement
        const currentUser = await userService.getUserById(req.user.userId);
        if (!currentUser) {
          return res.status(404).json({ message: 'Utilisateur courant non trouvé' });
        }

        const isCurrentlyFollowing = currentUser.following?.some(
          id => id.toString() === req.params.userId
        ) || false;

        console.log('État avant changement:');
        console.log('- Following array:', currentUser.following);
        console.log('- Is currently following:', isCurrentlyFollowing);

        // Utiliser le service existant pour mettre à jour la relation
        const result = await userService.followUser(req.user.userId, req.params.userId);

        if (!result) {
          return res.status(400).json({ message: 'Impossible de follow/unfollow l\'utilisateur' });
        }

        // Créer ou supprimer la notification selon l'action
        if (!isCurrentlyFollowing) {
          // C'était un follow
          console.log('🔄 Création notification follow...');
          const notification = await NotificationHelper.createFollowNotification(req.params.userId, req.user.userId);
          console.log('✅ Notification follow créée:', notification);
          res.json({ message: 'User followed successfully', action: 'followed' });
        } else {
          // C'était un unfollow
          console.log('🔄 Suppression notification follow...');
          await NotificationHelper.removeFollowNotification(req.params.userId, req.user.userId);
          console.log('✅ Notification follow supprimée');
          res.json({ message: 'User unfollowed successfully', action: 'unfollowed' });
        }

        console.log('=== DEBUG FOLLOW END ===');

      } catch (error) {
        console.error('❌ Erreur dans follow route:', error);
        if (error instanceof Error && error.message === "you can't follow yourself") {
          return res.status(400).json({ message: error.message });
        }
        if (error instanceof Error && error.message === 'User not found') {
          return res.status(404).json({ message: error.message });
        }
        res.status(500).json({
          message: 'Erreur lors du follow/unfollow',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    /**
     * @swagger
     * /api/users/suggestions:
     *   get:
     *     summary: obtain user suggestions
     *     tags: [User]
     *     responses:
     *       200:
     *         description: Suggestions retrieved successfully
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
        console.log('Suggestions d\'utilisateurs:', users);
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
     * /api/upload-profile-picture:
     *   post:
     *     summary: upload profile picture
     *     tags: [User]
     *     responses:
     *       200:
     *         description: Profile picture uploaded successfully
     *       400:
     *         description: Invalid parameters
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Server error
     */
    // Upload de photo de profil
    router.post('/upload-profile-picture', authMiddleware, async (req: Request, res: Response) => {
      try {
        if (!req.user?.userId) {
          return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        // Vérifier si les données de l'image sont présentes
        if (!req.body.base64 || !req.body.contentType) {
          return res.status(400).json({ message: 'Données de l\'image manquantes (base64 ou contentType)' });
        }

        // Valider le type MIME (uniquement images)
        const validImageTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml'
        ];

        if (!validImageTypes.includes(req.body.contentType.toLowerCase())) {
          return res.status(400).json({
            message: 'Format d\'image non supporté',
            acceptedTypes: validImageTypes
          });
        }

        // Limiter la taille de l'image (5MB)
        const base64Size = (req.body.base64.length * 3) / 4; // approximation en bytes
        const maxSizeImage = 5 * 1024 * 1024; // 5MB

        if (base64Size > maxSizeImage) {
          return res.status(400).json({
            message: `Image trop volumineuse (limite: 5MB)`
          });
        }

        // Générer l'URL de l'image (data URI)
        let dataUrl = req.body.base64;
        if (!dataUrl.startsWith('data:')) {
          dataUrl = `data:${req.body.contentType};base64,${dataUrl}`;
        }

        // Mettre à jour l'utilisateur avec la nouvelle photo de profil
        const user = await userService.getUserById(req.user.userId);

        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        user.profilePicture = dataUrl;
        await user.save();

        res.json({
          message: 'Photo de profil mise à jour avec succès',
          profilePicture: dataUrl
        });
      } catch (error) {
        console.error('Erreur lors du téléchargement de la photo de profil:', error);
        res.status(500).json({
          message: 'Erreur lors du téléchargement de la photo de profil',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }
}

new UsersRoutes();
export default router;