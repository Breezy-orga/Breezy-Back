import express, { Request, Response } from "express";
import { userService } from "../../services/userService";
import authMiddleware from "../../middleware/auth";

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
}
}
new FollowRoutes(); 
export default router;