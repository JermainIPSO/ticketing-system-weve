import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import authRoutes from './routes/auth';
import ticketsRoutes from './routes/tickets';
import { env } from './lib/env';

export const app = express();
const configuredOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  ...configuredOrigins,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);
const netlifyOriginPattern = /^https:\/\/[a-z0-9-]+\.netlify\.app$/i;

const isAllowedOrigin = (origin: string) =>
  allowedOrigins.has(origin) || netlifyOriginPattern.test(origin);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests without an Origin header.
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/tickets', ticketsRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err.message === 'Origin not allowed by CORS') {
      return res.status(403).json({ message: err.message });
    }

    if (err instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        issues: err.issues
      });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2021') {
        return res.status(500).json({
          message: 'Database not initialized. Run npm run db:sync.'
        });
      }
    }

    if (err instanceof Prisma.PrismaClientInitializationError) {
      return res.status(500).json({
        message: 'Database connection failed. Run npm run db:sync.'
      });
    }

    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
);
