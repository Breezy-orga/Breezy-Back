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
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    res.status(401).json({ message: 'Token invalide' });
  }
};

export default authMiddleware;
