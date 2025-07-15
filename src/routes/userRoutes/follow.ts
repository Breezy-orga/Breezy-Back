import express, { Request, Response } from "express";
import { userService } from "../../services/userService";
import authMiddleware from "../../middleware/auth";
import { NotificationHelper } from "../../utils/notificationHelper"; // Ajout de cet import

const router = express.Router();

class FollowRoutes {
constructor() {
  this.routes();
}
private routes() {

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
      console.log('Current user ID:', req.user.userId);
      console.log('Target user ID:', req.params.id);
      
      // Vérifier l'état avant le changement
      const currentUser = await userService.getUserById(req.user.userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'Utilisateur courant non trouvé' });
      }

      const isCurrentlyFollowing = currentUser.following?.some(
        id => id.toString() === req.params.id
      ) || false;
      
      console.log('État avant ');
      console.log('- Following array:', currentUser.following);
      console.log('- Is currently following:', isCurrentlyFollowing);
      
      // Utiliser le service existant
      const result = await userService.followUser(req.user.userId, req.params.id);
      console.log('Result from userService.followUser:', result);

      if (!result) {
        return res.status(400).json({ message: 'Unable to follow/unfollow user' });
      }
      
      // Créer ou supprimer la notification selon l'action
      if (!isCurrentlyFollowing) {
        console.log('Création notification follow...');
        const notification = await NotificationHelper.createFollowNotification(req.params.id, req.user.userId);
        console.log('Notification follow créée:', notification);
        res.json({ message: 'User followed successfully', action: 'followed' });
      } else {
        console.log('Suppression notification follow...');
        await NotificationHelper.removeFollowNotification(req.params.id, req.user.userId);
        console.log('Notification follow supprimée');
        res.json({ message: 'User unfollowed successfully', action: 'unfollowed' });
      }
      
    } catch (error) {
      console.error('Erreur dans follow route:', error);
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

      await NotificationHelper.removeFollowNotification(req.params.id, req.user.userId);

      res.json({ message: 'User unfollowed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
  });

router.get('/:id/following', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    const followingIds = (user.following || []).map(id => id.toString());
    const following = await userService.getUsersByIds(followingIds);
    res.json(following);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/:id/followers', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    const followersIds = (user.followers || []).map(id => id.toString());
    const followers = await userService.getUsersByIds(followersIds);
    res.json(followers);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error instanceof Error ? error.message : String(error) });
  }
});
}
}
new FollowRoutes(); 
export default router;