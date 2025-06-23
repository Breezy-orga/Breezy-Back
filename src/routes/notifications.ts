import express, { Request, Response } from 'express';
import authMiddleware from '../middleware/auth';
import Notification from '../models/Notification';
import User from '../models/User';

const router = express.Router();

// Récupérer les notifications de l'utilisateur connecté
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const notifications = await Notification.find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'username profilePicture')
      .populate('post', 'content');

    res.json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Marquer une notification comme lue
router.put('/:id/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    notification.read = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Marquer toutes les notifications comme lues
router.put('/read-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    await Notification.updateMany(
      { recipient: req.user.userId, read: false },
      { $set: { read: true } }
    );

    res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notifications:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une notification
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    res.json({ message: 'Notification supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Compter le nombre de notifications non lues
router.get('/unread-count', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const count = await Notification.countDocuments({
      recipient: req.user.userId,
      read: false,
    });

    res.json({ count });
  } catch (error) {
    console.error('Erreur lors du comptage des notifications non lues:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
