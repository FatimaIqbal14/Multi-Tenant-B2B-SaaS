import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import tenantRoutes from './routes/tenants.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { pool } from './db/pool.js';

export const app = express();
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'database unreachable' });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use(notFound);
app.use(errorHandler);
