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
     *   delete:
     *     summary: Supprimer un message privé
     *     tags: [PrivateMessages]
     *     parameters:
     *       - in: path
     *         name: messageId
     *         required: true
     *         description: ID du message à supprimer
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Message supprimé avec succès
     *       403:
     *         description: Vous ne pouvez supprimer que vos propres messages
     *       404:
     *         description: Message non trouvé
     *       500:
     *         description: Erreur lors de la suppression du message
     */
    router.delete('/delete/:messageId', auth, async (req: Request, res: Response) => {
      try {
        const messageId = req.params.messageId;
        const currentUserId = req.user?.userId;

        console.log('Tentative de suppression:', { messageId, currentUserId });

        if (!currentUserId) {
          return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        // Vérifier que le message existe et appartient à l'utilisateur
        const message = await PrivateMessage.findById(messageId);
        
        if (!message) {
          console.log('Message non trouvé:', messageId);
          return res.status(404).json({ message: 'Message non trouvé' });
        }

        console.log('Message trouvé:', {
          messageId: message._id,
          senderId: message.senderId.toString(),
          currentUserId: currentUserId
        });

        // Vérifier que l'utilisateur est bien l'expéditeur du message
        if (message.senderId.toString() !== currentUserId) {
          console.log('Tentative de suppression non autorisée:', {
            messageSenderId: message.senderId.toString(),
            currentUserId: currentUserId
          });
          return res.status(403).json({ 
            message: 'Vous ne pouvez supprimer que vos propres messages',
            debug: {
              messageSenderId: message.senderId.toString(),
              currentUserId: currentUserId,
              messageId: messageId
            }
          });
        }

        // Supprimer le message
        const result = await PrivateMessagesRepository.deleteMessage(messageId);
        
        console.log('Résultat de la suppression:', result);
        
        if (result) {
          res.json({ 
            message: 'Message supprimé avec succès', 
            deletedMessageId: messageId,
            success: true 
          });
        } else {
          res.status(500).json({ message: 'Erreur lors de la suppression du message' });
        }
      } catch (error: any) {
        console.error('Erreur lors de la suppression du message:', error);
        res.status(500).json({ 
          message: 'Erreur lors de la suppression du message', 
          error: error.message,
          messageId: req.params.messageId
        });
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