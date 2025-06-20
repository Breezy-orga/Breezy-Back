import express, { Request, Response, Router } from 'express';
import auth from '../middleware/auth';
import { PrivateMessagesRepository } from '../repositories/privateMessage.repository';

class PrivateMessageRoutes {
  public router: Router;

  constructor() {
    this.router = express.Router();
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
    this.router.get('/messagesWith/:userId', auth, async (req: Request, res: Response) => {
      try {
        const receiverId = Number(req.params.userId);
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
     *                 description: ID de l'utilisateur expéditeur
     *               receiverId:
     *                 type: number
     *                 description: ID de l'utilisateur destinataire
     *               content:
     *                 type: string
     *                 description: Contenu du message
     *     responses:
     *       201:
     *         description: Message envoyé avec succès
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors de l'envoi du message
     */
    this.router.post('/send', auth, async (req: Request, res: Response) => {
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
     *   parameters:
     *     - in: path
     *       name: messageId
     *       required: true
     *       description: ID du message à supprimer
     *       schema:
     *         type: string
     *   delete:
     *     summary: Supprimer un message privé
     *     tags: [PrivateMessages]
     *     responses:
     *       201:
     *         description: Message supprimé avec succès
     *       400:
     *         description: Mauvaise requête, paramètres manquants
     *       500:
     *         description: Erreur lors de la suppression du message
     */
    this.router.delete('/delete/:messageId', auth, async (req: Request, res: Response) => {
      try {
        const messageId  = Number(req.params.messageId)
        const result = await PrivateMessagesRepository.deleteMessage(messageId);
        res.json({ message: 'Message deleted successfully', result });
      } catch (error: any) {
        res.status(500).json({ message: 'Erreur lors de la suppression du message', error: error.message });
      }
    });
  }
}

export default new PrivateMessageRoutes().router;