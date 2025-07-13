import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import authMiddleware from '../middleware/auth';

const router = express.Router();

// Inscription
router.post('/register', async (req: Request, res: Response) => {
  console.log('Payload reçu pour register:', req.body);
  try {
    const { username, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Un utilisateur avec cet email ou ce nom d\'utilisateur existe déjà'
      });
    }

    // Créer un nouvel utilisateur
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Générer le token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'inscription', 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Connexion
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('BLABLABLABLA');
    const { identifier, password } = req.body;
    console.log('Login attempt with identifier:', identifier);

    // Trouver l'utilisateur par email ou username
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('No user found with identifier:', identifier);
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch ? 'Yes' : 'No');
    
    if (!isMatch) {
      console.log('Password does not match for user:', identifier);
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect' });
    }

    // Générer le token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    console.log('Token generated successfully for user:', identifier);

     // Définir le cookie sécurisé
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la connexion', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Récupérer l'utilisateur connecté
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Déconnexion
router.post('/logout', (req: Request, res: Response) => {
  // Supprime le cookie du token côté client
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  res.status(200).json({ message: 'Déconnecté' });
});

export default router;