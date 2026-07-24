import bcrypt from 'bcryptjs';
import { prisma } from '../../database/client';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../lib/errors';
import { RegisterInput, LoginInput } from './auth.schemas';
import { env } from '../../config/env';

const BCRYPT_ROUNDS = 12;

function buildTokenExpiry(): Date {
  // Parse "7d" → 7 days from now
  const raw = env.JWT_REFRESH_EXPIRES_IN;
  const match = raw.match(/^(\d+)([dhm])$/);
  const amount = match ? parseInt(match[1], 10) : 7;
  const unit = match ? match[2] : 'd';

  const ms =
    unit === 'd' ? amount * 86_400_000
    : unit === 'h' ? amount * 3_600_000
    : amount * 60_000;

  return new Date(Date.now() + ms);
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // If organizationName is provided, create a new org; otherwise the user joins without one
  let organizationId: string | undefined;
  if (input.organizationName) {
    const slug = input.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const org = await prisma.organization.create({
      data: { name: input.organizationName, slug: `${slug}-${Date.now()}` },
    });
    organizationId = org.id;
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      organizationId: organizationId ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const tokens = await issueTokens(user.id, user.email, user.role);
  return { user, tokens };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new UnauthorizedError('Invalid email or password');

  const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatch) throw new UnauthorizedError('Invalid email or password');

  const tokens = await issueTokens(user.id, user.email, user.role);

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, tokens };
}

export async function refreshTokens(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Rotate the token — invalidate old one
  await prisma.refreshToken.delete({ where: { token } });

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) throw new NotFoundError('User');

  return issueTokens(user.id, user.email, user.role);
}

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

async function issueTokens(userId: string, email: string, role: string) {
  const accessToken = signAccessToken({ sub: userId, email, role });
  const refreshToken = signRefreshToken({ sub: userId });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: buildTokenExpiry(),
    },
  });

  return { accessToken, refreshToken };
}
