import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../database/client';
import { NotFoundError, ForbiddenError } from '../../lib/errors';
import { JwtPayload } from '../../lib/jwt';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  organizationId: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function listUsers(_requestor: JwtPayload) {
  return prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUser(id: string, requestor: JwtPayload) {
  // Members can only fetch their own profile; admins can fetch anyone
  if (requestor.role === UserRole.MEMBER && requestor.sub !== id) {
    throw new ForbiddenError();
  }

  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function updateUserRole(id: string, role: UserRole, requestor: JwtPayload) {
  if (requestor.role !== UserRole.ADMIN) throw new ForbiddenError();

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  return prisma.user.update({ where: { id }, data: { role }, select: userSelect });
}
