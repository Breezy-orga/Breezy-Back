import { Request, Response, NextFunction } from 'express';

interface UserWithRole {
  role: string;
  [key: string]: any;
}

export default function authorize(...allowedRoles: string[]) {
  return (req: Request & { user?: UserWithRole }, res: Response, next: NextFunction) => {
    const user = req.user;
    //console.log('Role check:', user?.role);

    if (!user) {
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    next();
  };
}