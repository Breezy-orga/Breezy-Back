import express, { Request, Response } from 'express';
import authMiddleware from '../../middleware/auth';
import { RoleService } from '../../services/roleService';


const router = express.Router();


class RoleRoutes {
  constructor() {
    this.routes();
  }

  private routes() {

    router.put('/role/:userId', authMiddleware, async (req: Request, res: Response) => {
        
        const { userId } = req.params;
        const { role } = req.body.role;

        try {
          const updatedRole = await RoleService.updateUserRole(userId, role);
          res.json(updatedRole);
        } catch (error) {
          if (error instanceof Error && error.message === 'Role update failed') {
            return res.status(400).json({ message: error.message });
          }
          return res.status(500).json({ message: 'Internal server error' });
        }
    })
  }
}
new RoleRoutes();
export default router;