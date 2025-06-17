import express, { Request, Response } from 'express';
import authMiddleware from '../middleware/auth';
import User from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// Get current user profile
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

// Update user profile
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

// Get user by ID
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

// Follow user
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

// Unfollow user
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

// Obtenir le profil d'un utilisateur
router.get('/:userId', authMiddleware, async (req: Request, res: Response) => {
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

// Mettre à jour le profil
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
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

// Suivre/Ne plus suivre un utilisateur
router.post('/:userId/follow', authMiddleware, async (req: Request, res: Response) => {
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

// Obtenir les suggestions d'utilisateurs
router.get('/suggestions', authMiddleware, async (req: Request, res: Response) => {
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

export default router;
