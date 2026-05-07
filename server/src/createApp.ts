import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { prisma } from './db/prisma.js';
import { dbStatus, lastDbCheck } from './db/dbHealthMonitor.js';

import authRoutes from './routes/auth.js';
import { patientRoutes, prescriptionRoutes, labRoutes } from './domains/clinical/index.js';
import {
  invoiceRoutes,
  billingRoutes,
  subscriptionRoutes,
  paymentRoutes,
  subscriptionPaymentsAdminRoutes,
} from './domains/finance/index.js';
import { shopRoutes, productRoutes, orderRoutes } from './domains/retail/index.js';
import { appointmentRoutes } from './domains/workflow/index.js';
import communicationRoutes from './routes/communication.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import adminTenantRoutes from './routes/adminTenants.js';
import superAdminRoutes from './routes/superAdmin.js';
import uploadRoutes from './routes/upload.js';
import testRoutes from './routes/test.js';
import inviteRoutes from './routes/invite.js';
import activityRoutes from './routes/activity.js';
import clinicWorkspaceRoutes from './routes/clinicWorkspace.js';
import patientPortalRoutes from './routes/patientPortal.js';
import settingsRoutes from './routes/settings.js';
import brandingRoutes from './routes/branding.js';
import { isDatabaseUnreachableError, sendDatabaseUnavailable } from './utils/dbUnavailable.js';
import { handleRouteError } from './utils/routeErrors.js';
import { writeAuditLog } from './services/auditLogService.js';
import type { AuthRequest } from './middleware/auth.js';
import { businessApiAuthAndClinic, businessApiSubscription } from './middleware/apiBusinessFirewall.js';
import { blockStoreOnlyFromDpmsApi } from './middleware/dpmsRoleFirewall.js';
import { businessApiProductFeatures } from './middleware/productFeatureGate.js';
import { autoActivityLogger } from './middleware/autoActivityLogger.js';
import { clinicTierRateLimiter } from './middleware/clinicTierRateLimit.js';
import { auditHttpMiddleware } from './middleware/auditMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): express.Express {
  const app = express();

  const staticAllowedOrigins = new Set([
    'https://baigdentpro.com',
    'https://www.baigdentpro.com',
    'https://api.baigdentpro.com',
  ]);
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
      contentSecurityPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      noSniff: true,
      hidePoweredBy: true,
      xDnsPrefetchControl: { allow: false },
      ieNoOpen: true,
      originAgentCluster: true,
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 15552000, includeSubDomains: true, preload: false }
          : false,
    })
  );

  const allowOriginSet = new Set(allowedOrigins);
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowOriginSet.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  };
  app.use(
    cors(corsOptions)
  );
  app.options('*', cors(corsOptions));

  /** After CORS — browser SPA probes need Access-Control-Allow-Origin on this route. */
  app.get('/api/health', (_req, res) => {
    res.json({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      database: dbStatus,
      uptime: process.uptime(),
      ts: Date.now(),
      lastDbCheck,
    });
  });

  const authRateMaxDefault = process.env.NODE_ENV === 'production' ? '60' : '400';
  const authRateMax = Math.max(1, parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? authRateMaxDefault, 10) || parseInt(authRateMaxDefault, 10));
  /** Non-production: generous default so multi-tab QA / Playwright crawls are not blocked by 429s. */
  const apiRateMaxDefault = process.env.NODE_ENV === 'production' ? '300' : '8000';
  const apiRateMax = Math.max(1, parseInt(process.env.API_RATE_LIMIT_MAX ?? apiRateMaxDefault, 10) || parseInt(apiRateMaxDefault, 10));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: authRateMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: apiRateMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      const p = (req.originalUrl || '').split('?')[0];
      // SPA health probe; must not burn global /api budget (false "API connection failed" when 429).
      if (req.method === 'GET' && (p === '/api/health' || p.startsWith('/api/health/'))) return true;
      return false;
    },
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
  app.use(auditHttpMiddleware);
  app.use(businessApiAuthAndClinic);
  app.use(blockStoreOnlyFromDpmsApi);
  app.use(businessApiSubscription);
  app.use(businessApiProductFeatures);
  app.use((req, res, next) => clinicTierRateLimiter()(req, res, next));
  app.use(autoActivityLogger);
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

  app.get('/api/db/prisma-test', async (_req, res) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(404).json({ error: 'Not found' });
      return;
    }
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
  app.use('/api/admin', adminTenantRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/subscription-payments', subscriptionPaymentsAdminRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/invite', inviteRoutes);
  app.use('/api/subscription', subscriptionRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/super-admin', superAdminRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/test', testRoutes);
  }
  app.use('/api/clinic', clinicWorkspaceRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/patient-portal', patientPortalRoutes);
  app.use('/api/branding', brandingRoutes);

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

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[express]', req.method, req.originalUrl, err);
    if (res.headersSent) {
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (typeof msg === 'string' && msg.includes('[emrTenant]')) {
      const a = req as AuthRequest;
      void writeAuditLog({
        userId: a.user?.id ?? 'unknown',
        clinicId: a.businessClinicId ?? a.user?.clinicId ?? null,
        action: 'TENANT_VIOLATION',
        entityType: 'PRISMA',
        metadata: { message: msg, path: req.originalUrl ?? req.url },
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(500).json({ success: false, error: 'Tenant scope violation' });
      return;
    }
    if (isDatabaseUnreachableError(err)) {
      return sendDatabaseUnavailable(res);
    }
    handleRouteError(res, err, req.originalUrl || 'express');
  });

  return app;
}
