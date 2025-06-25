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
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ message: 'Accès non autorisé' });
      return;
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded as jwt.JwtPayload;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

export default authMiddleware;
