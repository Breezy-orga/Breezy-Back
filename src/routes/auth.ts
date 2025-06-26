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

    const responseData = {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    };

    console.log('Réponse d\'inscription réussie:', {
      userId: user._id,
      username: user.username,
      tokenLength: token.length
    });

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'inscription', 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Gestion des requêtes OPTIONS pour CORS
router.options('/login', (req: Request, res: Response) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  res.status(204).send();
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
    // Définir l'origine spécifique au lieu de * quand on utilise credentials
    const origin = req.headers.origin || '*';
    const isProduction = process.env.NODE_ENV === 'production';
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isSecure = isProduction;
    const isLocalDevelopment = !isProduction && isLocalhost;
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax' | 'none' | 'strict' | boolean;
      maxAge: number;
      path: string;
      domain?: string | undefined;
    } = {
      httpOnly: true,
      secure: isSecure,
      sameSite: isLocalDevelopment ? 'lax' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
      domain: isProduction ? '.breezy-app.com' : undefined
    };
    if (isLocalDevelopment) {
      console.log('Mode développement: configuration des cookies allégée');
    }
    res.cookie('token', token, cookieOptions);
    console.log('Réponse de connexion réussie:', {
      userId: user._id,
      username: user.username,
      tokenLength: token.length
    });
    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
    // Aucun code après ce return.
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
  try {
    const origin = req.headers.origin || '*';
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Supprimer le cookie d'authentification
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: isProduction ? '.breezy-app.com' : undefined
    });
    
    // En-têtes CORS
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    
    res.json({ success: true, message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la déconnexion', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;