import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Désactivation du rate limiting pour le développement
// const rateLimiter = new RateLimiterMemory({
//   points: 50, // 50 requêtes par minute par IP
//   duration: 60, // Période en secondes (1 minute)
//   blockDuration: 60 * 5, // Bloquer pendant 5 minutes si la limite est dépassée
//   keyPrefix: 'auth_limit', // Préfixe pour le stockage des clés
// });

// Fonction utilitaire pour vérifier la validité d'un token JWT
const verifyToken = (token: string): jwt.JwtPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET non configuré');
  }
  
  try {
    return jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
  } catch (error) {
    // Vérifier si le token a expiré
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expiré');
    }
    // Vérifier si le token est invalide
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token invalide');
    }
    throw error;
  }
};

// Middleware d'authentification principal
const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  try {
    // Vérification du rate limiting désactivée
    // try {
    //   await rateLimiter.consume(ip);
    // } catch (rateLimiterError) {
    //   console.warn(`Trop de tentatives de connexion depuis l'IP: ${ip}`);
    //   res.status(429).json({ 
    //     success: false, 
    //     message: 'Trop de requêtes, veuillez réessayer plus tard',
    //     code: 'TOO_MANY_REQUESTS'
    //   });
    //   return;
    // } 
    
    // Récupérer le token du header Authorization (Bearer ...) ou du cookie (token=...)
    function getTokenFromRequest(req: Request): string | undefined {
      // 1. Depuis le header Authorization
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.split(' ')[1];
      }
      // 2. Depuis le cookie
      if (req.cookies && req.cookies.token) {
        return req.cookies.token;
      }
      return undefined;
    }
    const token = getTokenFromRequest(req);
    
    if (!token) {
      console.log('Aucun token trouvé dans les en-têtes ou les cookies');
      res.status(401).json({ 
        success: false,
        message: 'Accès non autorisé - Authentification requise',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Vérifier et décoder le token
    const decoded = verifyToken(token);
    
    // S'assurer que le token contient un ID utilisateur
    if (!decoded.userId) {
      console.error('Token invalide: userId manquant');
      res.status(401).json({ 
        success: false,
        message: 'Token invalide - Informations manquantes',
        code: 'INVALID_TOKEN'
      });
      return;
    }
    
    // Vérifier si le token est sur le point d'expirer
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp - now < 3600) { // Moins d'une heure avant expiration
      // Ajouter un en-tête pour informer le client
      res.setHeader('X-Token-Expiring-Soon', 'true');
    }
    
    // Créer l'objet user avec les propriétés requises
    req.user = {
      ...decoded,
      id: decoded.userId, // Compatibilité avec les routes qui utilisent user.id
      userId: decoded.userId
    };
    
    // Ajouter des en-têtes de sécurité
    res.setHeader('X-Authenticated-User', decoded.userId);
    
    next();
  } catch (error) {
    console.error('Erreur de vérification du token:', error);
    
    // Gérer différents types d'erreurs
    let statusCode = 401;
    let errorMessage = 'Erreur d\'authentification';
    let errorCode = 'AUTH_ERROR';
    let errorDetails: string | undefined;
    
    // Type guard pour vérifier si l'erreur est une instance d'Error
    const isError = (e: unknown): e is Error => {
      return e instanceof Error;
    };
    
    if (isError(error)) {
      errorDetails = error.message;
      
      if (error.message.includes('expiré')) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        errorCode = 'TOKEN_EXPIRED';
      } else if (error.message.includes('invalide')) {
        errorMessage = 'Token d\'authentification invalide';
        errorCode = 'INVALID_TOKEN';
      }
    } else {
      // Si l'erreur n'est pas une instance d'Error, on la convertit en chaîne
      errorDetails = String(error);
    }
    
    const response: {
      success: boolean;
      message: string;
      code: string;
      error?: string;
    } = {
      success: false,
      message: errorMessage,
      code: errorCode,
    };

    // Ne pas exposer les détails de l'erreur en production
    if (process.env.NODE_ENV === 'development') {
      response.error = errorDetails;
    }

    res.status(statusCode).json(response);
  }
};

export default authMiddleware;
