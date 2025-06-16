const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
    

// obtenir les messages privés entre deux utilisateurs
router.get('/messagesWith/:userId', auth, async (req, res) => {
  try {
    const usersMessages = await User.getMessagesWith(req.user.userId, req.params.userId);
    res.json(usersMessages);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des messages', error: error.message });
  }
});