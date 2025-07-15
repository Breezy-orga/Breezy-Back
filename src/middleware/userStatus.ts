import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

// Middleware pour vérifier le statut de l'utilisateur
export const checkUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return next(); // Laisser authMiddleware gérer l'authentification
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier si l'utilisateur est banni
    if (user.status === 'banned') {
      return res.status(403).json({ 
        message: 'Votre compte a été banni',
        reason: user.suspensionReason,
        type: 'banned'
      });
    }

    // Vérifier si l'utilisateur est suspendu
    if (user.status === 'suspended') {
      // Vérifier si la suspension a expiré
      if (user.suspendedUntil && new Date() > user.suspendedUntil) {
        // Réactiver automatiquement l'utilisateur
        user.status = 'active';
        user.suspendedUntil = undefined;
        user.suspensionReason = undefined;
        await user.save();
      } else {
        return res.status(403).json({ 
          message: 'Votre compte est suspendu',
          reason: user.suspensionReason,
          suspendedUntil: user.suspendedUntil,
          type: 'suspended'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification du statut utilisateur:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la vérification du statut utilisateur',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Middleware spécifique pour les actions de création de contenu
export const checkContentCreationRights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier le statut avec plus de restrictions pour la création de contenu
    if (user.status !== 'active') {
      let message = 'Vous ne pouvez pas créer de contenu';
      let reason = user.suspensionReason;
      
      if (user.status === 'banned') {
        message = 'Votre compte est banni, vous ne pouvez pas créer de contenu';
      } else if (user.status === 'suspended') {
        if (user.suspendedUntil && new Date() > user.suspendedUntil) {
          // Réactiver automatiquement l'utilisateur
          user.status = 'active';
          user.suspendedUntil = undefined;
          user.suspensionReason = undefined;
          await user.save();
          return next();
        } else {
          message = 'Votre compte est suspendu, vous ne pouvez pas créer de contenu';
        }
      }

      return res.status(403).json({ 
        message,
        reason,
        suspendedUntil: user.suspendedUntil,
        type: user.status
      });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification des droits de création:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la vérification des droits',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};