import express from "express";
import authMiddleware from "../../middleware/auth";
import User from "../../models/User";
import { Request, Response } from "express";
import { userService } from "@/services/userService";


const router = express.Router();

class ProfileRoutes {
constructor() {
  this.routes();
}
private routes() {
  
  
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
      const user = await userService.getUserById(req.user.userId);

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
}
}
new ProfileRoutes(); 
export default router;