import './bootstrap-env.js';
import './startupEnv.js';

process.on('uncaughtException', (err: unknown) => {
  console.error('[FATAL uncaughtException]', err instanceof Error ? err.stack || err : err);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[FATAL unhandledRejection]', reason);
});

export { prisma, prismaBase } from './db/prisma.js';

import { createApp } from './createApp.js';
import { disconnectPrisma, prismaBase } from './db/prisma.js';
import { checkDatabaseHealth, startPeriodicDbHealthCheck } from './db/dbHealthMonitor.js';
import bcrypt from 'bcryptjs';

export { safeDbCall, checkDatabaseHealth } from './db/dbHealthMonitor.js';

async function bootstrap() {
  console.log('[BOOT] env loaded');
  console.log('[BOOT] env check', {
    hasDB: !!process.env.DATABASE_URL?.trim(),
    hasJWT: !!process.env.JWT_SECRET?.trim(),
    port: process.env.PORT,
  });

  try {
    const { validateProductionEnvironment } = await import('./utils/envSecurity.js');
    validateProductionEnvironment();
  } catch (e) {
    console.warn('[BOOT] env validation (non-fatal)', e instanceof Error ? e.message : e);
  }

  await startServer();
}

async function startServer() {
  const app = createApp();
  console.log('[BOOT] health endpoint ready');

  const raw = process.env.PORT || '5000';
  const n = Number(raw);
  const PORT = Number.isFinite(n) && n > 0 ? n : 5000;
  const listenHost = (process.env.HOST || process.env.LISTEN_HOST || '0.0.0.0').trim() || '0.0.0.0';

  console.log('[BOOT] server starting on', listenHost, 'PORT', PORT);

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, listenHost, () => {
      console.log('[BOOT] server listening SUCCESS', listenHost, PORT);
      void checkDatabaseHealth()
        .then(() => {
          return ensureStartupSuperAdminFromEnv();
        })
        .then(() => {
          startPeriodicDbHealthCheck();
        })
        .then(resolve, reject);
    });
    server.on('error', reject);
  });
}

async function ensureStartupSuperAdminFromEnv(): Promise<void> {
  const email = (process.env.SUPERADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  const password = (process.env.SUPERADMIN_BOOTSTRAP_PASSWORD || '').trim();
  const enabled = String(process.env.SUPERADMIN_BOOTSTRAP_ENABLED || '').trim() === '1';
  if (!enabled || !email || !password || process.env.NODE_ENV === 'production') {
    return;
  }
  const clinic = await prismaBase.clinic.upsert({
    where: { id: 'seed-clinic-baigdentpro' },
    update: { name: 'BaigDentPro Platform', isActive: true, plan: 'PREMIUM' },
    create: {
      id: 'seed-clinic-baigdentpro',
      name: 'BaigDentPro Platform',
      email,
      isActive: true,
      plan: 'PREMIUM',
    },
    select: { id: true },
  });
  const existing = await prismaBase.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  });
  if (!existing) {
    const hash = await bcrypt.hash(password, 12);
    await prismaBase.user.create({
      data: {
        email,
        password: hash,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        clinicId: clinic.id,
        clinicName: 'BaigDentPro Platform',
        isApproved: true,
        isActive: true,
      },
    });
  }
  const existingProducts = await prismaBase.product.count({ where: { clinicId: clinic.id } });
  if (existingProducts === 0) {
    await prismaBase.product.create({
      data: {
        clinicId: clinic.id,
        name: 'Starter Product',
        price: 199,
        costPrice: 99,
      },
    });
  }
  console.log('[BOOT] ensured default superadmin account');
}

bootstrap().catch((err: unknown) => {
  console.error('[BOOT CRASH]', err instanceof Error ? err.stack || err : err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('[shutdown] SIGTERM received, closing database client.');
  await disconnectPrisma();
  process.exit(0);
});
