import express, { Request, Response, NextFunction } from 'express';
import authMiddleware from '../middleware/auth';
import { checkUserStatus } from '../middleware/userStatus';
import Report from '../models/Report';
import User from '../models/User';
import Post from '../models/Post';
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

// Middleware pour vérifier les droits de modération
const checkModerationRights = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return res.status(403).json({ message: 'Droits de modération requis' });
    }

    req.moderator = user;
    next();
  } catch (error) {
    console.error('Erreur vérification droits modération:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un signalement
router.post('/report', authMiddleware, checkUserStatus, async (req: AuthRequest, res: Response) => {
  try {
    const { type, reason, postId, userId } = req.body;
    const reporterId = req.user!.userId;

    console.log('Création de signalement:', { type, reason, postId, userId, reporterId });

    // Validation des données
    if (!type || !reason) {
      return res.status(400).json({ 
        message: 'Le type et la raison sont requis',
        error: 'Données manquantes'
      });
    }

    // Vérifier qu'au moins un élément est signalé
    if (!postId && !userId) {
      return res.status(400).json({ 
        message: 'Un post ou un utilisateur doit être spécifié',
        error: 'Cible de signalement manquante'
      });
    }

    // Vérifier que l'utilisateur ne se signale pas lui-même
    if (userId && userId === reporterId) {
      return res.status(400).json({ 
        message: 'Vous ne pouvez pas vous signaler vous-même',
        error: 'Auto-signalement interdit'
      });
    }

    const reportData: any = {
      reporter: reporterId,
      type: type.toLowerCase(),
      reason: reason.trim(),
    };

    // Ajouter l'utilisateur signalé si spécifié
    if (userId) {
      const reportedUser = await User.findById(userId);
      if (!reportedUser) {
        return res.status(404).json({ 
          message: 'Utilisateur à signaler non trouvé',
          error: 'Utilisateur inexistant'
        });
      }
      reportData.reported = userId;
    }

    // Ajouter le post signalé si spécifié
    if (postId) {
      const reportedPost = await Post.findById(postId);
      if (!reportedPost) {
        return res.status(404).json({ 
          message: 'Post à signaler non trouvé',
          error: 'Post inexistant'
        });
      }
      reportData.post = postId;
      
      // Si un post est signalé, ajouter automatiquement son auteur
      if (!reportData.reported) {
        reportData.reported = reportedPost.author;
      }
    }

    // Vérifier s'il n'y a pas déjà un signalement identique récent (dernières 24h)
    const existingReport = await Report.findOne({
      reporter: reporterId,
      ...(postId && { post: postId }),
      ...(userId && { reported: userId }),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (existingReport) {
      return res.status(409).json({ 
        message: 'Vous avez déjà signalé ce contenu récemment',
        error: 'Signalement en double'
      });
    }

    // Créer le signalement
    const report = new Report(reportData);
    await report.save();

    console.log('Signalement créé avec succès:', report._id);

    // Réponse de succès avec statut 201
    res.status(201).json({ 
      message: 'Signalement créé avec succès',
      reportId: report._id,
      success: true
    });

  } catch (error) {
    console.error('Erreur lors de la création du signalement:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la création du signalement',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Récupérer les signalements
router.get('/reports', authMiddleware, checkModerationRights, async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const reports = await Report.find({ status })
      .populate('reporter', 'username profilePicture')
      .populate('reported', 'username profilePicture')
      .populate('post', 'content author createdAt')
      .populate('moderator', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Report.countDocuments({ status });

    res.json({
      reports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Erreur récupération signalements:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des signalements',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Mettre à jour un signalement
router.put('/reports/:reportId', authMiddleware, checkModerationRights, async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status, moderatorAction } = req.body;
    const moderatorId = req.user!.userId;

    console.log('Mise à jour signalement:', { reportId, status, moderatorAction, moderatorId });

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: 'ID de signalement invalide' });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Signalement non trouvé' });
    }

    // Mettre à jour le signalement
    report.status = status;
    report.moderator = new mongoose.Types.ObjectId(moderatorId);
    if (moderatorAction) {
      report.moderatorAction = moderatorAction;
    }

    await report.save();

    console.log('Signalement mis à jour avec succès');

    // Réponse de succès claire
    res.json({ 
      message: 'Signalement mis à jour avec succès',
      report: {
        id: report._id,
        status: report.status,
        moderatorAction: report.moderatorAction
      },
      success: true
    });

  } catch (error) {
    console.error('Erreur mise à jour signalement:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du signalement',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Suspendre un utilisateur
router.post('/users/:userId/suspend', authMiddleware, checkModerationRights, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration en jours
    const moderatorId = req.user!.userId;

    console.log('Suspension utilisateur:', { userId, reason, duration, moderatorId });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Empêcher la suspension d'admins par des modérateurs
    if (user.role === 'admin' && req.moderator?.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Vous ne pouvez pas suspendre un administrateur',
        error: 'Droits insuffisants'
      });
    }

    // Calculer la date d'expiration si une durée est spécifiée
    let suspendedUntil: Date | undefined;
    if (duration && duration > 0) {
      suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + duration);
    }

    // Mettre à jour l'utilisateur
    user.status = 'suspended';
    user.suspendedUntil = suspendedUntil;
    user.suspensionReason = reason || 'Suspension par modération';

    await user.save();

    // Créer l'action de modération
    const moderationAction = new ModerationAction({
      moderator: moderatorId,
      target: userId,
      action: 'suspend',
      reason: reason || 'Suspension par modération',
      duration,
      expiresAt: suspendedUntil
    });

    await moderationAction.save();

    // Ajouter à l'historique de modération
    user.moderationHistory.push(moderationAction._id);
    await user.save();

    console.log('Utilisateur suspendu avec succès');

    // Réponse de succès avec détails
    res.json({ 
      message: duration 
        ? `Utilisateur suspendu pour ${duration} jour(s)`
        : 'Utilisateur suspendu indéfiniment',
      user: {
        id: user._id,
        status: user.status,
        suspendedUntil: user.suspendedUntil,
        suspensionReason: user.suspensionReason
      },
      moderationAction: {
        id: moderationAction._id,
        action: moderationAction.action,
        duration: moderationAction.duration
      },
      success: true
    });

  } catch (error) {
    console.error('Erreur suspension utilisateur:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suspension de l\'utilisateur',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Bannir un utilisateur
router.post('/users/:userId/ban', authMiddleware, checkModerationRights, async (req: AuthRequest, res: Response) => {
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

// Débannir/réactiver un utilisateur
router.post('/users/:userId/unban', authMiddleware, checkModerationRights, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const moderatorId = req.user!.userId;

    console.log('Réactivation utilisateur:', { userId, reason, moderatorId });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.status === 'active') {
      return res.status(400).json({ 
        message: 'L\'utilisateur est déjà actif',
        error: 'Statut invalide'
      });
    }

    const previousStatus = user.status; // Sauvegarder l'ancien statut

    // Réactiver l'utilisateur
    user.status = 'active';
    user.suspendedUntil = undefined;
    user.suspensionReason = undefined;

    await user.save();

    // Créer l'action de modération avec le bon type d'action
    const moderationAction = new ModerationAction({
      moderator: moderatorId,
      target: userId,
      action: previousStatus === 'banned' ? 'unban' : 'unsuspend',
      reason: reason || 'Réactivation par modération'
    });

    await moderationAction.save();

    // Ajouter à l'historique de modération
    user.moderationHistory.push(moderationAction._id);
    await user.save();

    console.log('Utilisateur réactivé avec succès');

    // Réponse de succès
    res.json({ 
      message: 'Utilisateur réactivé avec succès',
      user: {
        id: user._id,
        status: user.status
      },
      moderationAction: {
        id: moderationAction._id,
        action: moderationAction.action
      },
      success: true
    });

  } catch (error) {
    console.error('Erreur réactivation utilisateur:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la réactivation de l\'utilisateur',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Supprimer un post
router.delete('/posts/:postId', authMiddleware, checkModerationRights, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;
    const moderatorId = req.user!.userId;

    console.log('Suppression post par modération:', { postId, reason, moderatorId });

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'ID de post invalide' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post non trouvé' });
    }

    // Créer l'action de modération avant suppression
    const moderationAction = new ModerationAction({
      moderator: moderatorId,
      target: post.author,
      action: 'delete_post',
      reason: reason || 'Suppression de post par modération'
    });

    await moderationAction.save();

    // Supprimer le post
    await Post.findByIdAndDelete(postId);

    // Supprimer aussi les commentaires enfants si c'est un post principal
    if (!post.parentPost) {
      await Post.deleteMany({ parentPost: postId });
    }

    console.log('Post supprimé avec succès par modération');

    // Réponse de succès
    res.json({ 
      message: 'Post supprimé avec succès',
      moderationAction: {
        id: moderationAction._id,
        action: moderationAction.action
      },
      success: true
    });

  } catch (error) {
    console.error('Erreur suppression post par modération:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du post',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour obtenir l'historique de modération d'un utilisateur
router.get('/users/:userId/history', authMiddleware, checkModerationRights, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const history = await ModerationAction.find({ target: userId })
      .populate('moderator', 'username')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      userId,
      history,
      success: true
    });

  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de l\'historique',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour obtenir les statistiques de modération
router.get('/stats', authMiddleware, checkModerationRights, async (req, res) => {
  try {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      pendingReports,
      totalReports,
      reportsLastWeek,
      reportsLastMonth,
      activeSuspensions,
      totalBans,
      moderationActionsToday
    ] = await Promise.all([
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments(),
      Report.countDocuments({ createdAt: { $gte: lastWeek } }),
      Report.countDocuments({ createdAt: { $gte: lastMonth } }),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ status: 'banned' }),
      ModerationAction.countDocuments({ createdAt: { $gte: today.setHours(0, 0, 0, 0) } })
    ]);

    res.json({
      reports: {
        pending: pendingReports,
        total: totalReports,
        lastWeek: reportsLastWeek,
        lastMonth: reportsLastMonth
      },
      users: {
        activeSuspensions,
        totalBans
      },
      actions: {
        today: moderationActionsToday
      },
      success: true
    });

  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des statistiques',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;