import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import authMiddleware from '../middleware/auth';
import { AuthService } from '../services/authService';

const router = express.Router();



/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilisateur créé
 *       400:
 *         description: Paramètres invalides
 *       500:
 *         description: Erreur serveur
 */
// Inscription
router.post('/register', async (req: Request, res: Response) => {
  console.log('Payload reçu pour register:', req.body);
  try {
    const user = await AuthService.register(req.body.username, req.body.email, req.body.password);

    await user.save();

    res.status(201).json({
      //token: AuthService.generateToken(user),
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



/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Identifiants invalides
 *       500:
 *         description: Erreur serveur
 */
// Connexion
router.post('/login', async (req: Request, res: Response) => {
  try {
    const user = await AuthService.login(req.body.email, req.body.password);
    res.json({ user, token: AuthService.generateToken(user) });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }
    if (error instanceof Error && error.message === 'Invalid password') {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    // Gérer les autres erreurs
    res.status(500).json({ 
      message: 'Erreur lors de la connexion', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});



/**
     * @swagger
     * /api/auth/me:
     *   get:
     *     summary: Récupérer les informations de l'utilisateur connecté
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Informations de l'utilisateur récupérées avec succès
     *       401:
     *         description: Utilisateur non authentifié
     *       500:
     *         description: Erreur lors de la récupération des informations de l'utilisateur
     */
// Récupérer l'utilisateur connecté
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await AuthService.getUserById(String(req.user?.userId));
    res.status(200).json(user);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    } else {
      res.status(500).json({
        message: 'Erreur serveur',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
});

export default router;
