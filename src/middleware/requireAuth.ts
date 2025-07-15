import { Request, Response, NextFunction } from 'express';


function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;

  // Redirection page d'accueil
  if (req.path === '/') {
    if (token) return res.redirect('/feed');
    else return res.redirect('/login');
  }

  // Redirection pour les routes protégées
  if (
    ['/feed', '/profile', '/dashboard'].some(path => req.path.startsWith(path)) &&
    !token
  ) {
    return res.redirect('/login');
  }

  next();
}

export default requireAuth;