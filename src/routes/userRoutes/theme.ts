
import express from "express";
import authMiddleware from "../../middleware/auth";
import { userService } from "../../services/userService";
import { Request, Response } from "express";

const router = express.Router();


class ThemeRoutes {
  constructor() {
    this.routes();
  }

  private routes() {

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

new ThemeRoutes(); 
export default router;