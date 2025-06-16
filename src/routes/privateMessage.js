const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PrivateMessagesRepository = require('../repository/privateMessageRepository');    

// obtenir les messages privés entre deux utilisateurs


/**
 * @swagger
 * /api/users:
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




router.delete('/delete/:messageId', auth, async (req, res) => {
  try {
    const result = await PrivateMessagesRepository.deleteMessage(req.params.messageId);
    res.json({ message: 'Message deleted successfully', result });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du message', error: error.message });
  }
});