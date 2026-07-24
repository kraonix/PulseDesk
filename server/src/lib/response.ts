import { Response } from 'express';

/**
 * Centralizes API response shape so every endpoint returns a consistent envelope.
 * Avoids repetitive `res.json({ success: true, data: ... })` patterns.
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200, message?: string) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    ...(message && { message }),
  });
}

export function sendError(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: message,
  });
}
