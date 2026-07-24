import { Router } from 'express';
import * as leadController from './lead.controller';
import { authenticate, requireRole } from '../../middleware/authenticate';
import { validateBody, validateQuery } from '../../middleware/validate';
import {
  createLeadSchema,
  updateLeadSchema,
  listLeadsQuerySchema,
  createNoteSchema,
} from './lead.schemas';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/',    validateQuery(listLeadsQuerySchema), leadController.list);
router.post('/',   validateBody(createLeadSchema),      leadController.create);
router.get('/:id',                                      leadController.get);
router.patch('/:id', validateBody(updateLeadSchema),    leadController.update);
router.delete('/:id', requireRole(UserRole.ADMIN),      leadController.remove);
router.post('/:id/notes', validateBody(createNoteSchema), leadController.addNote);

export default router;
