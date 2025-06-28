import express from "express";
import authMiddleware from "../../middleware/auth";
import User from "../../models/User";
import { Request, Response } from "express";
import { userService } from "../../services/userService";
import { MediaService } from "../../services/mediaService";


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

      // Only update fields that are provided and valid
      if (typeof displayName === 'string' && displayName.trim() !== '') {
        user.displayName = displayName.trim();
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

  /**
   * @swagger
   * /api/profile/me/avatar:
   *   post:
   *     summary: Upload profile picture
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
   *               image:
   *                 type: string
   *                 description: Base64 encoded image data
   *               contentType:
   *                 type: string
   *                 description: MIME type of the image (e.g., image/jpeg, image/png)
   *     responses:
   *       200:
   *         description: Profile picture updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 profilePicture:
   *                   type: string
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  router.post('/me/avatar', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
      }

      const { image, contentType } = req.body;

      // Validation
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ message: 'Image data is required' });
      }

      if (!contentType || typeof contentType !== 'string') {
        return res.status(400).json({ message: 'Content type is required' });
      }

      // Validate content type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(contentType)) {
        return res.status(400).json({ 
          message: 'Invalid content type. Allowed types: ' + allowedTypes.join(', ') 
        });
      }

      // Validate base64 format (remove data URL prefix if present)
      let base64Data = image;
      if (image.startsWith('data:')) {
        const base64Match = image.match(/^data:[^;]+;base64,(.+)$/);
        if (!base64Match) {
          return res.status(400).json({ message: 'Invalid base64 format' });
        }
        base64Data = base64Match[1];
      }

      // Validate base64 data
      try {
        Buffer.from(base64Data, 'base64');
      } catch (error) {
        return res.status(400).json({ message: 'Invalid base64 data' });
      }

      // Check file size (limit to 5MB)
      const sizeInBytes = (base64Data.length * 3) / 4;
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(400).json({ 
          message: 'File too large. Maximum size is 5MB' 
        });
      }

      // Find and update user
      const user = await User.findById(req.user.userId).select('-password -__v');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create the profile picture URL in the expected format
      const profilePictureUrl = `data:${contentType};base64,${base64Data}`;
      user.profilePicture = profilePictureUrl;

      // Save the updated user
      const updatedUser = await user.save();
      
      // Return the updated user without sensitive data
      const { password, ...userWithoutPassword } = updatedUser.toObject();
      
      res.json({
        message: 'Profile picture updated successfully',
        profilePicture: profilePictureUrl,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error in POST /profile/me/avatar:', error);
      res.status(500).json({ 
        message: 'Failed to update profile picture', 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });

  /**
   * @swagger
   * /api/profile/me/avatar:
   *   delete:
   *     summary: Remove profile picture
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profile picture removed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   *       500:
   *         description: Server error
   */
  router.delete('/me/avatar', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
      }

      // Find and update user
      const user = await User.findById(req.user.userId).select('-password -__v');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Reset to default avatar
      user.profilePicture = '/default-avatar.png';

      // Save the updated user
      const updatedUser = await user.save();
      
      // Return the updated user without sensitive data
      const { password, ...userWithoutPassword } = updatedUser.toObject();
      
      res.json({
        message: 'Profile picture removed successfully',
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error in DELETE /profile/me/avatar:', error);
      res.status(500).json({ 
        message: 'Failed to remove profile picture', 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
}
}
new ProfileRoutes(); 
export default router;