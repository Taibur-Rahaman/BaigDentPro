import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import appointmentRoutes from './routes/appointments.js';
import prescriptionRoutes from './routes/prescriptions.js';
import invoiceRoutes from './routes/invoices.js';
import labRoutes from './routes/lab.js';
import shopRoutes from './routes/shop.js';
import communicationRoutes from './routes/communication.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import superAdminRoutes from './routes/superAdmin.js';
import { validateProductionEnvironment } from './utils/envSecurity.js';
import { isDatabaseUnreachableError, sendDatabaseUnavailable } from './utils/dbUnavailable.js';

// Load server/.env regardless of process cwd (e.g. monorepo root)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

validateProductionEnvironment();

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cors({
  origin:
    process.env.NODE_ENV === 'production'
      ? (process.env.FRONTEND_URL?.split(',').map((o) => o.trim()).filter(Boolean) ?? [])
      : true,
  credentials: true,
}));

const authRateMax = Math.max(1, parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '60', 10) || 60);
const apiRateMax = Math.max(1, parseInt(process.env.API_RATE_LIMIT_MAX ?? '300', 10) || 300);

/** Slow brute-force / credential stuffing on auth endpoints */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

/** General API rate limit (DoS / abuse) */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: apiRateMax,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (_req, res) => {
  const payload: {
    status: string;
    timestamp: string;
    database?: 'connected' | 'disconnected';
    databaseError?: string;
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    payload.database = 'connected';
  } catch (err) {
    payload.database = 'disconnected';
    if (process.env.NODE_ENV !== 'production') {
      payload.databaseError = err instanceof Error ? err.message : String(err);
    } else {
      console.error('[health] database unreachable:', err instanceof Error ? err.message : err);
    }
  }
  const httpStatus = payload.database === 'disconnected' ? 503 : 200;
  res.status(httpStatus).json(payload);
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super-admin', superAdminRoutes);

/** Single-process production: serve Vite `dist` from repo root (run `npm run build:production` first). */
if (process.env.NODE_ENV === 'production') {
  const staticDir = path.resolve(__dirname, '../../dist');
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Not Found' });
        return;
      }
      res.sendFile(path.join(staticDir, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  } else {
    console.warn(
      `[startup] Frontend dist not found at ${staticDir} — API-only mode. Set FRONTEND_URL CORS and deploy the SPA separately, or run "npm run build" at repo root before start.`
    );
  }
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  if (isDatabaseUnreachableError(err)) {
    return sendDatabaseUnavailable(res);
  }
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: isProd && status >= 500 ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    ...(!isProd && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`🦷 BaigDentPro Server running on http://localhost:${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
