import express, { Request, Response, NextFunction } from 'express';
import authMiddleware from '../middleware/auth';
import User from '../models/User';
import Report from '../models/Report';
import ModerationAction from '../models/ModerationAction';
import mongoose from 'mongoose';

// Interface pour étendre Request avec user et moderator
interface AuthRequest extends Request {
  user?: {
    userId: string;
    role?: string;
  };
  moderator?: any;
}

const router = express.Router();

// Middleware pour vérifier les droits admin
const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Droits administrateur requis' });
    }

    req.moderator = user; // Ajouter le modérateur à la requête
    next();
  } catch (error) {
    res.status(500).json({ message: 'Erreur de vérification des droits' });
  }
};

// Middleware pour modérateur ou admin
const requireModerator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return res.status(403).json({ message: 'Droits de modération requis' });
    }

    req.moderator = user; // Ajouter le modérateur à la requête
    next();
  } catch (error) {
    res.status(500).json({ message: 'Erreur de vérification des droits' });
  }
};

// GET /api/admin/dashboard
router.get('/dashboard', authMiddleware, requireModerator, async (req: AuthRequest, res: Response) => {
  try {
    const [
      pendingReports,
      totalUsers,
      suspendedUsers,
      bannedUsers,
      recentActions
    ] = await Promise.all([
      Report.countDocuments({ status: 'pending' }),
      User.countDocuments(),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ status: 'banned' }),
      ModerationAction.find()
        .populate('moderator', 'username')
        .populate('target', 'username')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    res.json({
      stats: {
        pendingReports,
        totalUsers,
        suspendedUsers,
        bannedUsers
      },
      recentActions
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement du tableau de bord' });
  }
});

// GET /api/admin/users
router.get('/users', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query: any = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const users = await User.find(query)
      .select('-password')
      .populate('moderationHistory')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / Number(limit)),
        hasNext: skip + Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement des utilisateurs' });
  }
});

// POST /api/admin/users/:userId/suspend
router.post('/users/:userId/suspend', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { reason, duration } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Impossible de suspendre un administrateur' });
    }

    const expiresAt = duration ? new Date(Date.now() + (duration * 24 * 60 * 60 * 1000)) : undefined;

    user.status = 'suspended';
    user.suspendedUntil = expiresAt;
    user.suspensionReason = reason;
    await user.save();

    // Créer l'action de modération
    const moderationAction = new ModerationAction({
      moderator: req.user!.userId,
      target: req.params.userId,
      action: 'suspend',
      reason,
      duration,
      expiresAt
    });
    await moderationAction.save();

    res.json({ 
      message: 'Utilisateur suspendu', 
      expiresAt,
      success: true
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suspension' });
  }
});

// POST /api/admin/users/:userId/ban
router.post('/users/:userId/ban', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const moderatorId = req.user!.userId;

    console.log('Bannissement utilisateur:', { userId, reason, moderatorId });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Empêcher le bannissement d'admins par des modérateurs
    if (user.role === 'admin' && req.moderator?.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Vous ne pouvez pas bannir un administrateur',
        error: 'Droits insuffisants'
      });
    }

    // Mettre à jour l'utilisateur
    user.status = 'banned';
    user.suspendedUntil = undefined; // Pas de date d'expiration pour un ban
    user.suspensionReason = reason || 'Bannissement par modération';

    await user.save();

    // Créer l'action de modération
    const moderationAction = new ModerationAction({
      moderator: moderatorId,
      target: userId,
      action: 'ban',
      reason: reason || 'Bannissement par modération'
    });

    await moderationAction.save();

    // Ajouter à l'historique de modération
    user.moderationHistory.push(moderationAction._id);
    await user.save();

    console.log('Utilisateur banni avec succès');

    // Réponse de succès
    res.json({ 
      message: 'Utilisateur banni avec succès',
      user: {
        id: user._id,
        status: user.status,
        suspensionReason: user.suspensionReason
      },
      moderationAction: {
        id: moderationAction._id,
        action: moderationAction.action
      },
      success: true
    });

  } catch (error) {
    console.error('Erreur bannissement utilisateur:', error);
    res.status(500).json({ 
      message: 'Erreur lors du bannissement de l\'utilisateur',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/admin/users/:userId/unban 
router.post('/users/:userId/unban', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const previousStatus = user.status;
    user.status = 'active';
    user.suspendedUntil = undefined;
    user.suspensionReason = undefined;
    await user.save();

    // Créer l'action de modération
    const moderationAction = new ModerationAction({
      moderator: req.user!.userId,
      target: req.params.userId,
      action: previousStatus === 'banned' ? 'unban' : 'unsuspend',
      reason: reason || 'Réactivation du compte'
    });
    await moderationAction.save();

    res.json({ 
      message: 'Utilisateur réactivé',
      success: true
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la réactivation' });
  }
});

export default router;