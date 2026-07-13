import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';

import authRouter from './routes/auth';
import appointmentsRouter from './routes/appointments';
import waitlistRouter from './routes/waitlist';
import confirmRouter from './routes/confirm';
import analyticsRouter from './routes/analytics';
import notificationsRouter from './routes/notifications';

const app = express();

// CORS
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));

// JSON body parser
app.use(express.json());

// Global rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Auth endpoint'leri için daha katı limit
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/waitlist', waitlistRouter);
app.use('/api/confirm', confirmRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notifications', notificationsRouter);

// Health check
app.get('/health', (_req: Request, res: Response) => { res.json({ status: 'ok' }); });

// 404
app.use((_req: Request, res: Response) => { res.status(404).json({ error: 'Endpoint bulunamadı' }); });

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const referenceId = randomUUID().slice(0, 8).toUpperCase();
  console.error(`[${referenceId}]`, err.message);
  res.status(500).json({ error: 'Sunucu hatası oluştu', referenceId });
});

export default app;
