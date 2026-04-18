import { createHash } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { JWT_SECRET } from '../utils/config.js';
import { signAccessToken } from '../utils/accessToken.js';
import {
  issueRefreshToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshTokenByRaw,
  validateRefreshToken,
} from '../services/refreshTokenService.js';
import { assertPasswordAcceptable } from '../utils/passwordPolicy.js';
import { getSupabaseAdmin } from '../utils/supabaseServer.js';
import { normalizeAuthEmail, syncSupabasePasswordForEmail, syncSupabaseSessionVersionForEmail } from '../services/supabaseAuthSync.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { validateBody } from '../middleware/validateBody.js';
import { strictAuthLimiter, loginBruteLimiter, registerEmailLimiter } from '../middleware/authLimits.js';
import { isPrismaUniqueViolation } from '../utils/prismaErrors.js';
import { bumpSessionVersion } from '../services/sessionVersionService.js';
import {
  loginBodySchema,
  registerSaasBodySchema,
  registerClinicBodySchema,
  syncPrismaPasswordBodySchema,
  authProfileBodySchema,
  authPasswordBodySchema,
  authRefreshBodySchema,
  authLogoutBodySchema,
  authLogoutAllBodySchema,
  type LoginBody,
  type RegisterSaasBody,
  type RegisterClinicBody,
  type AuthProfileBody,
} from '../validation/schemas.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { recordFailedLoginFraud } from '../services/fraudAlertService.js';
import { logActivity } from '../services/clinicActivityLogService.js';
import {
  effectivePlanName,
  mergePlanFeatures,
  resolveDeviceLimit,
  type SubscriptionWithPlan,
} from '../services/planCatalog.js';
import { assertDeviceCapacityForLogin, computeLoginDeviceId, recordDeviceSession } from '../services/deviceSessionService.js';

// Centralized in config.ts

const router = Router();

async function subscriptionPlanSnapshot(clinicId: string | null): Promise<string | undefined> {
  if (!clinicId) return undefined;
  const [sub, clinic] = await Promise.all([
    prisma.subscription.findUnique({
      where: { clinicId },
      include: { planRef: true },
    }),
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { plan: true } }),
  ]);
  return effectivePlanName(sub as SubscriptionWithPlan | null, clinic?.plan ?? 'FREE');
}

type SubscriptionTenantPayload = {
  clinicId: string;
  plan: string;
  planId: string | null;
  status: string;
  features: unknown;
  planFeatures: Record<string, unknown>;
  deviceLimit: number;
  expiresAt: Date | null;
  endDate: Date | null;
};

async function subscriptionTenantPayload(clinicId: string | null): Promise<SubscriptionTenantPayload | null> {
  if (!clinicId) return null;
  const sub = await prisma.subscription.findUnique({
    where: { clinicId },
    include: { planRef: true },
  });
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { plan: true } });
  const row = sub as SubscriptionWithPlan | null;
  const plan = effectivePlanName(row, clinic?.plan ?? 'FREE');
  const merged = mergePlanFeatures(row?.planRef?.features, row?.features);
  const deviceLimit = await resolveDeviceLimit(row);
  return {
    clinicId,
    plan,
    planId: row?.planId ?? null,
    status: row?.status ?? 'ACTIVE',
    features: row?.features ?? {},
    planFeatures: merged,
    deviceLimit,
    expiresAt: row?.expiresAt ?? null,
    endDate: row?.endDate ?? null,
  };
}

function parseBearerAccessToken(req: { headers: { authorization?: string }; body?: { accessToken?: string } }): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const t = authHeader.slice(7).trim();
    if (t) return t;
  }
  const bodyToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken.trim() : '';
  return bodyToken || null;
}

async function findUserByEmailInsensitive(email: string) {
  const trimmed = email.trim();
  return prisma.user.findFirst({
    where: { email: { equals: trimmed, mode: 'insensitive' } },
  });
}

/** Correlates attempts in logs without printing the full email (monitoring / incident review). */
function logFailedLoginAttempt(req: { ip?: string; socket?: { remoteAddress?: string } }, normalizedEmail: string): void {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const id = createHash('sha256').update(normalizedEmail.toLowerCase()).digest('hex').slice(0, 16);
  console.warn(`[security] failed_login ip=${ip} email_hash=${id}`);
  void recordFailedLoginFraud(ip, id);
}

/** Self-service SaaS tenant: approved immediately, receives JWT (catalog + orders APIs). */
router.post(
  '/register-saas',
  registerEmailLimiter,
  loginBruteLimiter,
  strictAuthLimiter,
  validateBody(registerSaasBodySchema),
  asyncRoute('auth.register-saas', async (req, res) => {
    try {
      const { email: rawEmail, password, name: nameRaw } = req.body as RegisterSaasBody;
      const email = normalizeAuthEmail(rawEmail);

      assertPasswordAcceptable(password, 'Password');

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      const name = (nameRaw?.trim() || email.split('@')[0] || 'User').slice(0, 200);
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.$transaction(async (tx) => {
        const clinic = await tx.clinic.create({
          data: {
            name: `${name}'s workspace`,
          },
        });

        const freePlan = await tx.plan.findUnique({ where: { name: 'FREE' } });
        await tx.subscription.create({
          data: {
            clinicId: clinic.id,
            plan: freePlan?.name ?? 'FREE',
            planId: freePlan?.id,
            status: 'ACTIVE',
            startDate: new Date(),
          },
        });

        const created = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            role: 'TENANT',
            clinicId: clinic.id,
            isApproved: true,
            isActive: true,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            clinicId: true,
            isApproved: true,
            sessionVersion: true,
          },
        });

        await tx.clinic.update({ where: { id: clinic.id }, data: { ownerId: created.id } });
        return created;
      });

      void syncSupabasePasswordForEmail(email, password).then((r) => {
        if (!r.synced && r.note && r.note !== 'supabase_not_configured') {
          console.warn('[register-saas] Supabase Auth sync:', r.note);
        }
      });

      void syncSupabaseSessionVersionForEmail(user.email, user.sessionVersion);

      const planSnapshot = await subscriptionPlanSnapshot(user.clinicId);
      const token = signAccessToken(user, { planSnapshot });
      const refreshToken = await issueRefreshToken(user.id);

      void logActivity({
        userId: user.id,
        clinicId: user.clinicId,
        action: 'USER_CREATED',
        entity: 'USER',
        entityId: user.id,
        meta: { source: 'REGISTER_SAAS' },
      });

      void writeAuditLog({
        userId: user.id,
        action: 'REGISTER_SAAS',
        entityId: user.id,
        metadata: { clinicId: user.clinicId },
      });

      const tenant = await subscriptionTenantPayload(user.clinicId);
      res.status(201).json({ user, token, refreshToken, tenant });
    } catch (e: unknown) {
      if (isPrismaUniqueViolation(e)) {
        res.status(400).json({ error: 'Email already exists' });
        return;
      }
      throw e;
    }
  })
);

router.post(
  '/register',
  registerEmailLimiter,
  loginBruteLimiter,
  strictAuthLimiter,
  validateBody(registerClinicBodySchema),
  asyncRoute('auth.register', async (req, res) => {
    try {
      const { email: rawEmail, password, name, clinicName, phone } = req.body as RegisterClinicBody;
      const email = normalizeAuthEmail(rawEmail);

      assertPasswordAcceptable(password, 'Password');

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.$transaction(async (tx) => {
        const clinic = await tx.clinic.create({
          data: {
            name: clinicName || `${name}'s Clinic`,
            phone,
          },
        });

        const freePlan = await tx.plan.findUnique({ where: { name: 'FREE' } });
        await tx.subscription.create({
          data: {
            clinicId: clinic.id,
            plan: freePlan?.name ?? 'FREE',
            planId: freePlan?.id,
            status: 'ACTIVE',
            startDate: new Date(),
          },
        });

        const created = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            clinicName,
            phone,
            role: 'CLINIC_ADMIN',
            clinicId: clinic.id,
            isApproved: false,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            clinicName: true,
            clinicId: true,
            isApproved: true,
            sessionVersion: true,
          },
        });

        await tx.clinic.update({ where: { id: clinic.id }, data: { ownerId: created.id } });
        return created;
      });

      void syncSupabasePasswordForEmail(email, password).then((r) => {
        if (!r.synced && r.note && r.note !== 'supabase_not_configured') {
          console.warn('[register] Supabase Auth sync:', r.note);
        }
      });

      void writeAuditLog({
        userId: user.id,
        action: 'REGISTER_CLINIC',
        entityId: user.id,
        metadata: { clinicId: user.clinicId, pendingApproval: true },
      });

      res.status(201).json({
        user,
        pendingApproval: true,
        message:
          'Your clinic account was created and is pending approval. You will be able to sign in after a platform administrator approves it.',
      });
    } catch (e: unknown) {
      if (isPrismaUniqueViolation(e)) {
        res.status(400).json({ error: 'Email already exists' });
        return;
      }
      throw e;
    }
  })
);

router.post(
  '/login',
  loginBruteLimiter,
  strictAuthLimiter,
  validateBody(loginBodySchema),
  asyncRoute('auth.login', async (req, res) => {
    const body = req.body as LoginBody;
    const { email: rawEmail, password } = body;
    const email = normalizeAuthEmail(String(rawEmail));

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logFailedLoginAttempt(req, email);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logFailedLoginAttempt(req, email);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        error: 'This account has been disabled. Contact your clinic administrator.',
      });
      return;
    }

    if (!user.isApproved) {
      res.status(403).json({
        error: 'Your registration is still pending approval by a platform administrator. You cannot sign in yet.',
      });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { clinicId: user.clinicId },
      include: { planRef: true },
    });
    const skipDevice = user.role === 'SUPER_ADMIN';
    const deviceId = computeLoginDeviceId(req);
    const gate = await assertDeviceCapacityForLogin({
      clinicId: user.clinicId,
      userId: user.id,
      deviceId,
      subscription: subscription as SubscriptionWithPlan | null,
      skipLimit: skipDevice,
    });
    if (!gate.ok) {
      res.status(403).json({ error: gate.message });
      return;
    }
    await recordDeviceSession(user.id, user.clinicId, deviceId);

    void syncSupabaseSessionVersionForEmail(user.email, user.sessionVersion);

    const planSnapshot = await subscriptionPlanSnapshot(user.clinicId);
    const token = signAccessToken(user, { planSnapshot });
    const refreshToken = await issueRefreshToken(user.id);

    void logActivity({
      userId: user.id,
      clinicId: user.clinicId,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      meta: { method: 'password' },
      req,
    });

    void writeAuditLog({
      userId: user.id,
      clinicId: user.clinicId,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
      metadata: { method: 'password' },
    });

    const tenant = await subscriptionTenantPayload(user.clinicId);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinicName,
        clinicAddress: user.clinicAddress,
        clinicPhone: user.clinicPhone,
        degree: user.degree,
        specialization: user.specialization,
      },
      token,
      refreshToken,
      tenant,
    });
  })
);

router.post(
  '/refresh',
  strictAuthLimiter,
  validateBody(authRefreshBodySchema),
  asyncRoute('auth.refresh', async (req, res) => {
    const { refreshToken: raw } = req.body as { refreshToken: string };
    const row = await validateRefreshToken(raw);
    if (!row) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }
    await revokeRefreshTokenByRaw(raw);
    const refreshToken = await issueRefreshToken(row.userId);
    void syncSupabaseSessionVersionForEmail(row.user.email, row.user.sessionVersion);
    const planSnapshot = await subscriptionPlanSnapshot(row.user.clinicId);
    const token = signAccessToken(row.user, { planSnapshot });
    const tenant = await subscriptionTenantPayload(row.user.clinicId);
    res.json({
      user: {
        id: row.user.id,
        email: row.user.email,
        name: row.user.name,
        role: row.user.role,
        clinicId: row.user.clinicId,
      },
      token,
      refreshToken,
      tenant,
    });
  })
);

router.post(
  '/logout',
  strictAuthLimiter,
  validateBody(authLogoutBodySchema),
  asyncRoute('auth.logout', async (req, res) => {
    const { refreshToken: bodyRt } = req.body as { refreshToken?: string };

    const authHeader = req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const bearer = authHeader.slice(7).trim();
      if (bearer) {
        try {
          const decoded = jwt.verify(bearer, JWT_SECRET, { algorithms: ['HS256'] }) as { userId?: string };
          if (decoded.userId) {
            await revokeAllRefreshTokensForUser(decoded.userId);
            await bumpSessionVersion(decoded.userId);
            if (bodyRt) await revokeRefreshTokenByRaw(bodyRt);
            void writeAuditLog({
              userId: decoded.userId,
              action: 'LOGOUT',
              entityId: decoded.userId,
              metadata: { via: 'access_token' },
            });
            res.json({ success: true, message: 'Logged out' });
            return;
          }
        } catch {
          /* fall through: e.g. expired access token — still allow refresh-only logout */
        }
      }
    }

    if (bodyRt) {
      await revokeRefreshTokenByRaw(bodyRt);
      res.json({ success: true, message: 'Logged out' });
      return;
    }

    res.status(400).json({
      error: 'Provide refreshToken in JSON body and/or a valid Authorization bearer to revoke sessions',
    });
  })
);

router.post(
  '/logout-all',
  strictAuthLimiter,
  authenticate,
  validateBody(authLogoutAllBodySchema),
  asyncRoute('auth.logout-all', async (req: AuthRequest, res) => {
    await revokeAllRefreshTokensForUser(req.user!.id);
    await bumpSessionVersion(req.user!.id);
    void writeAuditLog({
      userId: req.user!.id,
      action: 'LOGOUT_ALL_DEVICES',
      entityId: req.user!.id,
      metadata: {},
    });
    res.json({ success: true, message: 'All sessions revoked; sign in again on this device.' });
  })
);

/** Exchange a valid Supabase access token for an app JWT (user must exist in Prisma with same email). */
router.post(
  '/supabase-session',
  strictAuthLimiter,
  asyncRoute('auth.supabase-session', async (req, res) => {
    const accessToken = parseBearerAccessToken(req);
    if (!accessToken) {
      res.status(400).json({ error: 'Missing access token' });
      return;
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      res.status(503).json({ error: 'Supabase authentication is not configured on the server' });
      return;
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(accessToken);
    if (authErr || !authData.user?.email) {
      res.status(401).json({ error: 'Invalid or expired Supabase session' });
      return;
    }

    const user = await findUserByEmailInsensitive(authData.user.email);
    if (!user) {
      res.status(403).json({
        error:
          'No BaigDentPro account exists for this email. Register first, or ask an administrator to link your Supabase user.',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        error: 'This account has been disabled. Contact your clinic administrator.',
      });
      return;
    }

    if (!user.isApproved) {
      res.status(403).json({
        error: 'Your registration is still pending approval by a platform administrator. You cannot sign in yet.',
      });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { clinicId: user.clinicId },
      include: { planRef: true },
    });
    const skipDevice = user.role === 'SUPER_ADMIN';
    const deviceId = computeLoginDeviceId(req);
    const gate = await assertDeviceCapacityForLogin({
      clinicId: user.clinicId,
      userId: user.id,
      deviceId,
      subscription: subscription as SubscriptionWithPlan | null,
      skipLimit: skipDevice,
    });
    if (!gate.ok) {
      res.status(403).json({ error: gate.message });
      return;
    }
    await recordDeviceSession(user.id, user.clinicId, deviceId);

    void syncSupabaseSessionVersionForEmail(user.email, user.sessionVersion);

    const planSnapshot = await subscriptionPlanSnapshot(user.clinicId);
    const token = signAccessToken(user, { planSnapshot });
    const refreshToken = await issueRefreshToken(user.id);

    void logActivity({
      userId: user.id,
      clinicId: user.clinicId,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      meta: { method: 'supabase_exchange' },
      req,
    });

    void writeAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entityId: user.id,
      metadata: { method: 'supabase_exchange' },
    });

    const tenant = await subscriptionTenantPayload(user.clinicId);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinicName,
        clinicAddress: user.clinicAddress,
        clinicPhone: user.clinicPhone,
        degree: user.degree,
        specialization: user.specialization,
      },
      token,
      refreshToken,
      tenant,
    });
  })
);

/** After Supabase password recovery, keep Prisma `password` in sync so legacy API login still works. */
router.post(
  '/sync-prisma-password',
  strictAuthLimiter,
  validateBody(syncPrismaPasswordBodySchema),
  asyncRoute('auth.sync-prisma-password', async (req, res) => {
    const accessToken = parseBearerAccessToken(req);
    if (!accessToken) {
      res.status(400).json({ error: 'Missing access token' });
      return;
    }

    const { password } = req.body as { password: string };

    assertPasswordAcceptable(password, 'Password');

    const admin = getSupabaseAdmin();
    if (!admin) {
      res.status(503).json({ error: 'Supabase authentication is not configured on the server' });
      return;
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(accessToken);
    if (authErr || !authData.user?.email) {
      res.status(401).json({ error: 'Invalid or expired Supabase session' });
      return;
    }

    const user = await findUserByEmailInsensitive(authData.user.email);
    if (!user) {
      res.status(404).json({ error: 'No BaigDentPro account for this email' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, sessionVersion: { increment: 1 } },
    });
    await revokeAllRefreshTokensForUser(user.id);

    res.json({ message: 'Password updated' });
  })
);

router.get(
  '/me',
  authenticate,
  asyncRoute('auth.me', async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clinicId: true,
        isActive: true,
        isApproved: true,
        phone: true,
        clinicName: true,
        clinicAddress: true,
        clinicPhone: true,
        clinicEmail: true,
        clinicLogo: true,
        degree: true,
        specialization: true,
        licenseNo: true,
      },
    });
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.role === 'TENANT' && !user.clinicId) {
      res.status(403).json({ success: false, error: 'Account is missing clinic assignment' });
      return;
    }

    const scopeClinicId = req.effectiveClinicId ?? user.clinicId;
    const tenant = await subscriptionTenantPayload(scopeClinicId);
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        name: user.name,
        phone: user.phone,
        clinicName: user.clinicName,
        isActive: user.isActive,
        isApproved: user.isApproved,
      },
      tenant,
    });
  })
);

router.put(
  '/profile',
  authenticate,
  validateBody(authProfileBodySchema),
  asyncRoute('auth.profile', async (req: AuthRequest, res) => {
    const body = req.body as AuthProfileBody;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.clinicName !== undefined ? { clinicName: body.clinicName } : {}),
        ...(body.clinicAddress !== undefined ? { clinicAddress: body.clinicAddress } : {}),
        ...(body.clinicPhone !== undefined ? { clinicPhone: body.clinicPhone } : {}),
        ...(body.clinicEmail !== undefined
          ? { clinicEmail: body.clinicEmail === '' ? null : body.clinicEmail }
          : {}),
        ...(body.degree !== undefined ? { degree: body.degree } : {}),
        ...(body.specialization !== undefined ? { specialization: body.specialization } : {}),
        ...(body.licenseNo !== undefined ? { licenseNo: body.licenseNo } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clinicName: true,
        clinicAddress: true,
        clinicPhone: true,
        clinicEmail: true,
        degree: true,
        specialization: true,
        licenseNo: true,
      },
    });

    res.json(user);
  })
);

router.put(
  '/password',
  authenticate,
  validateBody(authPasswordBodySchema),
  asyncRoute('auth.password', async (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    assertPasswordAcceptable(newPassword, 'New password');

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword, sessionVersion: { increment: 1 } },
    });
    await revokeAllRefreshTokensForUser(req.user!.id);

    void syncSupabasePasswordForEmail(user.email, newPassword).then((r) => {
      if (!r.synced && r.note && r.note !== 'supabase_not_configured') {
        console.warn('[password] Supabase Auth sync:', r.note);
      }
    });

    res.json({ message: 'Password updated successfully' });
  })
);

export default router;
