const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PrivateMessagesRepository = require('../repository/privateMessageRepository');    

// obtenir les messages privés entre deux utilisateurs


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
router.get('/messagesWith/:userId', auth, async (req, res) => {
  try {
    const usersMessages = await PrivateMessagesRepository.getMessagesWith(req.user.userId, req.params.userId);
    res.json(usersMessages);
  } catch (error) {
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

router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver ID and content are required' });
    }

    const message = await PrivateMessagesRepository.createPrivateMessage(req.user.userId, receiverId, content);
    res.status(201).json(message);
  } catch (error) {
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
router.delete('/delete/:messageId', auth, async (req, res) => {
  try {
    const result = await PrivateMessagesRepository.deleteMessage(req.params.messageId);
    res.json({ message: 'Message deleted successfully', result });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du message', error: error.message });
  }
});

module.exports = router;