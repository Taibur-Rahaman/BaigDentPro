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
import testRoutes from './routes/test.js';
import { validateProductionEnvironment } from './utils/envSecurity.js';
import { isDatabaseUnreachableError, sendDatabaseUnavailable } from './utils/dbUnavailable.js';

// Load server/.env regardless of process cwd (e.g. monorepo root)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/** Monorepo root package.json version, or override with APP_VERSION (e.g. git SHA in CI). */
function readRootPackageVersion(): string | undefined {
  try {
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const j = JSON.parse(raw) as { version?: string };
    return typeof j.version === 'string' ? j.version : undefined;
  } catch {
    return undefined;
  }
}
const APP_VERSION_PUBLIC = process.env.APP_VERSION?.trim() || readRootPackageVersion();
const API_ROUTES = [
  '/api/health',
  '/api/auth',
  '/api/patients',
  '/api/appointments',
  '/api/prescriptions',
  '/api/invoices',
  '/api/lab',
  '/api/shop',
  '/api/communication',
  '/api/dashboard',
  '/api/admin',
  '/api/super-admin',
  '/api/test',
];

function getDatabaseHost(): string {
  try {
    const raw = process.env.DATABASE_URL ?? '';
    if (!raw) return 'not-set';
    const parsed = new URL(raw);
    return parsed.hostname || 'unknown';
  } catch {
    return 'invalid-url';
  }
}

function getDatabaseDiagnostics(): {
  host: string;
  username: string;
  port: string;
  databaseName: string;
  sslEnabled: boolean;
  usernameMatchesExpectedRef: boolean;
  passwordEncodingHint?: string;
} {
  const expectedUsername = 'postgres.oytcchmlbdpxodigqdxu';
  try {
    const raw = process.env.DATABASE_URL ?? '';
    if (!raw) {
      return {
        host: 'not-set',
        username: 'not-set',
        port: 'not-set',
        databaseName: 'not-set',
        sslEnabled: false,
        usernameMatchesExpectedRef: false,
      };
    }
    const parsed = new URL(raw);
    const username = parsed.username || 'unknown';
    const databaseName = parsed.pathname.replace(/^\/+/, '') || 'unknown';
    const sslmode = parsed.searchParams.get('sslmode')?.toLowerCase() ?? '';
    const sslEnabled = sslmode === 'require' || sslmode === 'verify-full' || sslmode === 'no-verify';
    const decodedPassword = parsed.password || '';
    const hasReservedChars = /[@:/?#]/.test(decodedPassword);
    const hasEncodedFragments = /%(40|3A|2F|3F|23)/i.test(raw);
    const passwordEncodingHint =
      hasReservedChars && !hasEncodedFragments
        ? 'Password may need URL encoding. Example: @ -> %40, : -> %3A, / -> %2F, ? -> %3F, # -> %23.'
        : undefined;
    return {
      host: parsed.hostname || 'unknown',
      username,
      port: parsed.port || '5432',
      databaseName,
      sslEnabled,
      usernameMatchesExpectedRef: username === expectedUsername,
      ...(passwordEncodingHint ? { passwordEncodingHint } : {}),
    };
  } catch {
    return {
      host: 'invalid-url',
      username: 'invalid-url',
      port: 'invalid-url',
      databaseName: 'invalid-url',
      sslEnabled: false,
      usernameMatchesExpectedRef: false,
    };
  }
}

validateProductionEnvironment();

function getPrismaDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    const isSupabasePooler = parsed.hostname.includes('pooler.supabase.com');
    if (isSupabasePooler) {
      // Prisma + transaction poolers require pgBouncer compatibility mode.
      if (!parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true');
      }
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '1');
      }
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getPrismaDatasourceUrl(),
    },
  },
});

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;
const staticAllowedOrigins = new Set(['https://baigdentpro.com', 'https://www.baigdentpro.com']);
const configuredOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...configuredOrigins, ...staticAllowedOrigins]);

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [...allowedOrigins] : true,
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
app.use((req, _res, next) => {
  const startedAt = new Date().toISOString();
  console.info(`[${startedAt}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'BaigDentPro API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', async (_req, res) => {
  const payload: {
    status: string;
    timestamp: string;
    version?: string;
    database?: 'connected' | 'disconnected';
    databaseError?: string;
    diagnostics?: {
      databaseHost: string;
      databaseUsername: string;
      databasePort: string;
      databaseName: string;
      databaseSslEnabled: boolean;
      usernameMatchesExpectedRef: boolean;
      hasDatabaseUrl: boolean;
      hasSupabaseUrl: boolean;
      hasSupabaseServiceRoleKey: boolean;
      passwordEncodingHint?: string;
    };
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    ...(APP_VERSION_PUBLIC ? { version: APP_VERSION_PUBLIC } : {}),
    diagnostics: {
      databaseHost: getDatabaseDiagnostics().host,
      databaseUsername: getDatabaseDiagnostics().username,
      databasePort: getDatabaseDiagnostics().port,
      databaseName: getDatabaseDiagnostics().databaseName,
      databaseSslEnabled: getDatabaseDiagnostics().sslEnabled,
      usernameMatchesExpectedRef: getDatabaseDiagnostics().usernameMatchesExpectedRef,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL?.trim()),
      hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      ...(getDatabaseDiagnostics().passwordEncodingHint
        ? { passwordEncodingHint: getDatabaseDiagnostics().passwordEncodingHint }
        : {}),
    },
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

app.get('/api/db/prisma-test', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, database: 'connected' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(503).json({ success: false, error: message });
  }
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
app.use('/api/test', testRoutes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      error: 'API route not found',
      method: req.method,
      path: req.originalUrl,
    });
    return;
  }
  next();
});

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

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  if (isDatabaseUnreachableError(err)) {
    return sendDatabaseUnavailable(res);
  }
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: isProd && status >= 500 ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    path: req.originalUrl,
    method: req.method,
    ...(!isProd && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  const host = process.env.HOST?.trim() || '0.0.0.0';
  const publicUrl = process.env.PUBLIC_URL?.trim() || `http://${host}:${PORT}`;
  console.log(`[startup] Node ${process.version} | env=${process.env.NODE_ENV ?? 'development'}`);
  console.log(`[startup] Server listening on ${host}:${PORT}`);
  console.log(`[startup] Public URL ${publicUrl}`);
  console.log(`[startup] Health ${publicUrl}/api/health`);
  console.log(`[startup] Mounted routes: ${API_ROUTES.join(', ')}`);
  console.log(`[startup] DATABASE_URL host: ${getDatabaseHost()}`);
  const dbDiag = getDatabaseDiagnostics();
  console.log(`[startup] DATABASE_URL username: ${dbDiag.username}`);
  console.log(`[startup] DATABASE_URL sslmode enabled: ${dbDiag.sslEnabled}`);
  if (dbDiag.passwordEncodingHint) {
    console.warn(`[startup] ${dbDiag.passwordEncodingHint}`);
  }
  console.log(`[startup] SUPABASE_URL present: ${Boolean(process.env.SUPABASE_URL?.trim())}`);
  console.log(`[startup] SUPABASE_SERVICE_ROLE_KEY present: ${Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())}`);
});

process.on('SIGTERM', async () => {
  console.log('[shutdown] SIGTERM received, closing database client.');
  await prisma.$disconnect();
  process.exit(0);
});
