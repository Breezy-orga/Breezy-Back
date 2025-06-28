import express, { Request, Response, Router } from 'express';
import auth from '../middleware/auth';
import { PrivateMessagesRepository } from '../repositories/privateMessage.repository';
import User from '../models/User';
import PrivateMessage, { IPrivateMessage } from '../models/PrivateMessages';


const router = express.Router();

class PrivateMessageRoutes {
  constructor() {
    this.routes();
  }

  private routes() {
    /**
     * @swagger
     * /api/privateMessages/messagesWith/{userId}:
     *   parameters:
     *     - in: path
     *       name: userId
     *       required: true
     *       description: ID de l'utilisateur avec lequel récupérer les messages
     *       schema:
     *         type: string
     *   get:
     *     summary: Récupérer tous les messages privés entre 2 utilisateurs
     *     tags: [PrivateMessages]
     *     responses:
     *       201:
     *         description: Liste des messages privés
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors de la récupération des messages
     */
    router.get('/messagesWith/:userId', auth, async (req: Request, res: Response) => {
      try {
        const receiverId = req.params.userId;
        const usersMessages = await PrivateMessagesRepository.getMessagesWith(req.user?.userId, receiverId);
        res.json(usersMessages);
      } catch (error: any) {
        res.status(500).json({ message: 'Erreur lors de la récupération des messages', error: error.message });
      }
    });

    /**
     * @swagger
     * /api/privateMessages/send:
     *   post:
     *     summary: Envoyer un message privé
     *     tags: [PrivateMessages]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               senderId:
     *                 type: number
     *               receiverId:
     *                 type: number
     *               content:
     *                 type: string
     *     responses:
     *       201:
     *         description: Message envoyé avec succès
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors de l'envoi du message
     */
    router.post('/', auth, async (req: Request, res: Response) => {
      try {
        const { receiverId, content } = req.body;
        if (!receiverId || !content) {
          return res.status(400).json({ message: 'Receiver ID and content are required' });
        }
        const message = await PrivateMessagesRepository.createPrivateMessage(req.user?.userId, receiverId, content);
        res.status(201).json(message);
      } catch (error: any) {
        res.status(500).json({ message: 'Erreur lors de l\'envoi du message', error: error.message });
      }
    });

    /**
     * @swagger
     * /api/privateMessages/delete/{messageId}:
     */
    router.delete('/delete/:messageId', auth, async (req: Request, res: Response) => {
      try {
        const messageId = req.params.messageId;
        const result = await PrivateMessagesRepository.deleteMessage(messageId);
        res.json({ message: 'Message deleted successfully', result });
      } catch (error: any) {
        res.status(500).json({ message: 'Erreur lors de la suppression du message', error: error.message });
      }
    });

    /**
     * @swagger
     * /api/privateMessages/conversations:
     *   get:
     *     summary: Récupérer la liste des conversations de l'utilisateur courant
     *     tags: [PrivateMessages]
     *     responses:
     *       200:
     *         description: Liste des conversations
     *       401:
     *         description: Non authentifié
     *       500:
     *         description: Erreur serveur
     */
    router.get('/conversations', auth, async (req: Request, res: Response) => {
      try {
        const me = req.user!.userId;

        const all = await PrivateMessage.find({
          $or: [{ senderId: me }, { receiverId: me }]
        }).exec();

        const grouped: Record<string, IPrivateMessage[]> = {};
        all.forEach((msg: IPrivateMessage) => {
          const other =
            msg.senderId.toString() === me
              ? msg.receiverId.toString()
              : msg.senderId.toString();
          if (!grouped[other]) grouped[other] = [];
          grouped[other].push(msg);
        });

        const convs = await Promise.all(
          Object.entries(grouped).map(async ([userId, msgs]) => {
            // tri décroissant sur timestamp
            msgs.sort((a: IPrivateMessage, b: IPrivateMessage) =>
              b.timestamp.getTime() - a.timestamp.getTime()
            );
            const last = msgs[0];

            // Charger le profil de l'autre utilisateur
            const user = await User.findById(userId)
              .select('_id username profilePicture')
              .lean();
            if (!user) return null;

            return {
              _id: userId,
              withUser: {
                _id: user._id!,
                username: user.username,
                avatar: user.profilePicture
              },
              lastMessage: {
                text: last.content,
                createdAt: last.timestamp
              }
            };
          })
        );

        res.json(convs.filter((c): c is NonNullable<typeof c> => Boolean(c)));
      } catch (error: any) {
        //console.error('PrivateMessages /conversations error:', error);
        res
          .status(500)
          .json({ message: 'Erreur lors de la récupération des conversations', error: error.message });
      }
    });
  }
}

new PrivateMessageRoutes();
export default router;