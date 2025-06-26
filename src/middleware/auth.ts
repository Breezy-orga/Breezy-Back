import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extension de l'interface Request pour inclure l'utilisateur décodé du token JWT
declare module 'express' {
  interface Request {
    user?: any
  }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Récupérer le token du header
    const token =
      req.cookies?.token ||
      req.header('Authorization')?.replace('Bearer ', '');
    
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // S'assurer que le token contient un ID utilisateur
    if (!(decoded as any).userId) {
      console.error('Token invalide: userId manquant');
      res.status(401).json({ 
        success: false,
        message: 'Token invalide - Informations manquantes',
        code: 'INVALID_TOKEN'
      });
      return;
    }
    req.user = decoded as jwt.JwtPayload;
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
