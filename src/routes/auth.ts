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
      { userId: user._id },
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
    console.log('Requête de connexion reçue:', {
      body: { ...req.body, password: req.body.password ? '***' : 'non fourni' },
      headers: req.headers,
      method: req.method,
      url: req.url
    });

    const { identifier, email, username, password } = req.body;
    
    // Gérer à la fois l'ancien format (email/username) et le nouveau (identifier)
    const loginIdentifier = identifier || email || username;
    
    if (!loginIdentifier) {
      const error = 'Email ou nom d\'utilisateur requis';
      console.error('Erreur de connexion:', error);
      return res.status(400).json({ message: error });
    }
    
    if (!password) {
      const error = 'Mot de passe requis';
      console.error('Erreur de connexion:', error);
      return res.status(400).json({ message: error });
    }
    
    console.log('Login attempt with identifier:', loginIdentifier);

    // Trouver l'utilisateur par email ou username
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier },
        { username: loginIdentifier }
      ]
    });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('No user found with identifier:', loginIdentifier);
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
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    
    const responseData = {
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    };
    
    console.log('Réponse de connexion réussie:', {
      userId: user._id,
      username: user.username,
      tokenLength: token.length
    });

    // Définir l'origine spécifique au lieu de * quand on utilise credentials
    const origin = req.headers.origin || '*';
    const isProduction = process.env.NODE_ENV === 'production';
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    
    // Configuration du cookie
    const isSecure = isProduction; // Seulement HTTPS en production
    const isLocalDevelopment = !isProduction && isLocalhost;
    
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax' | 'none' | 'strict' | boolean;
      maxAge: number;
      path: string;
      domain?: string | undefined;
    } = {
      httpOnly: true, // Empêche l'accès au cookie via JavaScript
      secure: isSecure, // HTTPS requis uniquement en production
      sameSite: isLocalDevelopment ? 'lax' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24h
      path: '/', // Accessible sur tout le domaine
      // En développement, on ne définit pas le domaine pour permettre les cookies cross-origin
      domain: isProduction ? '.breezy-app.com' : undefined
    };
    
    // En développement, on peut être moins strict avec les cookies
    if (isLocalDevelopment) {
      console.log('Mode développement: configuration des cookies allégée');
      // En développement, on peut désactiver secure pour le support HTTP
      cookieOptions.secure = false;
      // On utilise 'lax' pour sameSite en développement
      cookieOptions.sameSite = 'lax';
      // On s'assure que le domaine n'est pas défini pour le développement local
      delete cookieOptions.domain;
    }
    
    // Journalisation des options du cookie (sans le token)
    console.log('Cookie options:', {
      ...cookieOptions,
      value: '[REDACTED]',
      domain: cookieOptions.domain || 'localhost (default)'
    });
    
    // Définir le cookie HTTP-Only sécurisé
    res.cookie('token', token, cookieOptions);
    
    // Ajouter un en-tête supplémentaire pour les clients qui ne supportent pas les cookies HTTP-Only
    // (à utiliser uniquement si nécessaire et avec précaution)
    if (!isProduction) {
      res.setHeader('X-Auth-Token', token);
    }
    
    // En-têtes CORS
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    
    // Pour le débogage
    console.log('Response headers:', {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin'
    });
    
    // Retourner les données utilisateur (sans le token, qui est déjà dans le cookie)
    const { token: _, ...userData } = responseData;
    res.json(userData);
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
