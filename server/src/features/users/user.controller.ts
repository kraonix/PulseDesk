import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import * as userService from './user.service';
import { sendSuccess } from '../../lib/response';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userService.listUsers(req.user!);
    sendSuccess(res, users);
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUser(req.params.id, req.user!);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { role } = z.object({ role: z.nativeEnum(UserRole) }).parse(req.body);
    const user = await userService.updateUserRole(req.params.id, role, req.user!);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
