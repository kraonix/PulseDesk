import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { env } from '../config/env';

/**
 * Global error handler. Must be registered last in the Express middleware chain.
 * Handles Zod validation errors, domain errors, and unhandled exceptions consistently.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Zod validation error — extract human-readable field messages
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(422).json({
      success: false,
      data: null,
      error: `Validation failed: ${messages}`,
    });
  }

  // Domain errors with an explicit status code
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      error: err.message,
    });
  }

  // Unknown errors — log detail in dev, return generic message in prod
  const message =
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err instanceof Error
        ? err.message
        : 'Unknown error';

  if (env.NODE_ENV !== 'test') {
    console.error('[Unhandled Error]', err);
  }

  return res.status(500).json({
    success: false,
    data: null,
    error: message,
  });
}
