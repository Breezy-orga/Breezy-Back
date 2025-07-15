import express from "express";
import authMiddleware from "../../middleware/auth";
import User from "../../models/User";
import { Request, Response } from "express";
import { userService } from "../../services/userService";


const router = express.Router();

class ProfileRoutes {
constructor() {
  this.routes();
}
private routes() {
  
  
  /**
   * @swagger
   * /api/profile/me:
   *   get:
   *     summary: Get current authenticated user's profile
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Successfully retrieved user profile
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized - User not authenticated
   *       404:
   *         description: User not found
   *       500:
   *         description: Server error
   */
  router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }

      // Only populate valid fields that exist on the User model
      const user = await userService.getUserByIdSelectAndPopulate(
        req.user.userId, 
        '-password', 
        ['followers', 'following']
      );
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error in GET /profile/me:', error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });



  /**
   * @swagger
   * /api/profile/me:
   *   put:
   *     summary: Update current user's profile
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               displayName:
   *                 type: string
   *                 description: User's display name
   *               bio:
   *                 type: string
   *                 description: User's biography
   *               profilePicture:
   *                 type: string
   *                 description: URL to the user's profile picture
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized - User not authenticated
   *       404:
   *         description: User not found
   *       500:
   *         description: Server error
   */
  router.put('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
      }

      const { displayName, bio, profilePicture } = req.body;
      
      // Find user and exclude sensitive fields
      const user = await User.findById(req.user.userId).select('-password -__v');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      
      if (typeof bio === 'string') {
        user.bio = bio;
      }
      
      if (typeof profilePicture === 'string' && profilePicture.trim() !== '') {
        user.profilePicture = profilePicture.trim();
      }

      // Save the updated user
      const updatedUser = await user.save();
      
      // Return the updated user without sensitive data
      const { password, ...userWithoutPassword } = updatedUser.toObject();
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error in PUT /profile/me:', error);
      res.status(500).json({ 
        message: 'Failed to update profile', 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
}
}
new ProfileRoutes(); 
export default router;