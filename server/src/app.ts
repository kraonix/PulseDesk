import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './features/auth/auth.routes';
import leadRoutes from './features/leads/lead.routes';
import { captureRouter } from './features/leads/lead.capture';
import userRoutes from './features/users/user.routes';

export function createApp() {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(compression());

  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  // Global rate limiter — 200 req/15min per IP
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, error: 'Too many requests, please try again later' },
  });
  app.use(limiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/leads/capture', captureRouter);   // public — no auth
  app.use('/api/leads', leadRoutes);              // authenticated
  app.use('/api/users', userRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, data: null, error: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
}
