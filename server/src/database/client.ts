import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/**
 * Single Prisma client instance for the entire app.
 * In development, we attach it to globalThis to avoid exhausting
 * the connection pool during hot reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
