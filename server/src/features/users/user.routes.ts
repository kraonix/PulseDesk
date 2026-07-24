import { Router } from 'express';
import * as userController from './user.controller';
import { authenticate, requireRole } from '../../middleware/authenticate';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', userController.list);
router.get('/:id', userController.get);
router.patch('/:id/role', requireRole(UserRole.ADMIN), userController.updateRole);

export default router;
