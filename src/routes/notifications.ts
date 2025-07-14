import express, { Request, Response } from 'express';
import authMiddleware from '../middleware/auth';
import Notification from '../models/Notification';

const router = express.Router();

/**
 * @swagger
 * /api/notifications/:
 *   get:
 *     summary: get notifications for the connected user
 *     tags: [User]
 *     responses:
 *       200:
 *         description: user notifications retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
// Récupérer les notifications de l'utilisateur connecté
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const notifications = await Notification.find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'username profilePicture name')
      .populate('post', 'content')
      .limit(50); // Limiter pour les performances

    res.json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/notifications/:
 *   post:
 *     summary: create a new notification
 *     tags: [User]
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// Créer une nouvelle notification
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const { recipient, type, post } = req.body;

    // Validation des données
    if (!recipient || !type) {
      return res.status(400).json({ message: 'Destinataire et type requis' });
    }

    if (!['mention', 'like', 'follow'].includes(type)) {
      return res.status(400).json({ message: 'Type de notification invalide' });
    }

    // Ne pas créer de notification pour soi-même
    if (recipient === req.user.userId) {
      return res.status(400).json({ message: 'Impossible de créer une notification pour soi-même' });
    }

    // Vérifier si une notification similaire existe déjà (pour éviter les doublons)
    if (type === 'like' && post) {
      const existingNotification = await Notification.findOne({
        recipient,
        sender: req.user.userId,
        type: 'like',
        post
      });

      if (existingNotification) {
        return res.status(200).json(existingNotification); // Notification déjà existante
      }
    }

    const notification = new Notification({
      recipient,
      sender: req.user.userId,
      type,
      post: post || undefined,
      read: false
    });

    await notification.save();

    // Populer les données avant de renvoyer
    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'username profilePicture name')
      .populate('post', 'content');

    res.status(201).json(populatedNotification);
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: mark a notification as read
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
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

    // Si déjà lue, pas besoin de faire quoi que ce soit
    if (notification.read) {
      return res.json(notification);
    }

    notification.read = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: mark all notifications as read
 *     tags: [User]
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/read-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const result = await Notification.updateMany(
      { recipient: req.user.userId, read: false },
      { $set: { read: true } }
    );

    res.json({ 
      message: 'Toutes les notifications ont été marquées comme lues',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notifications:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: suppress a notification
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: count of unread notifications
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Unread notifications count retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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

// Fonction utilitaire pour créer des notifications (à utiliser dans d'autres routes)
export const createNotification = async (
  recipient: string,
  sender: string,
  type: 'mention' | 'like' | 'follow' ,
  post?: string
) => {
  try {
    // Ne pas créer de notification pour soi-même
    if (recipient === sender) {
      return null;
    }

    // Vérifier les doublons pour les likes
    if (type === 'like' && post) {
      const existing = await Notification.findOne({
        recipient,
        sender,
        type: 'like',
        post
      });
      if (existing) return existing;
    }

    const notification = new Notification({
      recipient,
      sender,
      type,
      post: post || undefined,
      read: false
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Erreur lors de la création de notification:', error);
    return null;
  }
};

export default router;