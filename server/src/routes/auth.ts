import { createHash } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, prismaBase } from '../db/prisma.js';
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
import { isPrismaSchemaDriftError, isPrismaUniqueViolation } from '../utils/prismaErrors.js';
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
import { sanitizeDegree, sanitizeSpecialization, sanitizeTitle } from '../utils/professionalIdentity.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { recordFailedLoginFraud } from '../services/fraudAlertService.js';
import { logActivity } from '../services/clinicActivityLogService.js';
import {
  effectivePlanName,
  mergePlanFeatures,
  resolveDeviceLimit,
  type SubscriptionWithPlan,
} from '../services/planCatalog.js';
import { resolveProductFeaturesForClinic } from '../services/productFeatures.js';
import { assertDeviceCapacityForLogin, computeLoginDeviceId, recordDeviceSession } from '../services/deviceSessionService.js';
import { resolveJwtCapabilitiesForUser } from '../services/capabilityJwtPayload.js';

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
  planTier: string;
  productFeatures: Record<string, boolean>;
};

async function subscriptionTenantPayload(clinicId: string | null): Promise<SubscriptionTenantPayload | null> {
  if (!clinicId) return null;
  const sub = await prisma.subscription.findUnique({
    where: { clinicId },
    include: { planRef: true },
  });
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { plan: true, planTier: true },
  });
  const row = sub as SubscriptionWithPlan | null;
  const plan = effectivePlanName(row, clinic?.plan ?? 'FREE');
  const merged = mergePlanFeatures(row?.planRef?.features, row?.features);
  const deviceLimit = await resolveDeviceLimit(row);
  const productFeaturesObj = await resolveProductFeaturesForClinic(clinicId);
  const productFeatures: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(productFeaturesObj)) {
    productFeatures[k] = v;
  }
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
    planTier: clinic?.planTier ?? 'STARTER',
    productFeatures,
  };
}

/** Single subscription/clinic fetch for login — avoids duplicate `$transaction`/`findUnique` work on the hot path. */
async function loadLoginSubscriptionContext(clinicId: string | null): Promise<{
  subscription: SubscriptionWithPlan | null;
  planSnapshot: string | undefined;
  tenant: SubscriptionTenantPayload | null;
}> {
  if (!clinicId) {
    return { subscription: null, planSnapshot: undefined, tenant: null };
  }
  const [sub, clinic] = await Promise.all([
    prisma.subscription.findUnique({
      where: { clinicId },
      include: { planRef: true },
    }),
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { plan: true, planTier: true } }),
  ]);
  const row = sub as SubscriptionWithPlan | null;
  const planSnapshot = effectivePlanName(row, clinic?.plan ?? 'FREE');
  const merged = mergePlanFeatures(row?.planRef?.features, row?.features);
  const deviceLimit = await resolveDeviceLimit(row);
  const productFeaturesObj = await resolveProductFeaturesForClinic(clinicId);
  const productFeatures: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(productFeaturesObj)) {
    productFeatures[k] = v;
  }
  const tenant: SubscriptionTenantPayload = {
    clinicId,
    plan: planSnapshot,
    planId: row?.planId ?? null,
    status: row?.status ?? 'ACTIVE',
    features: row?.features ?? {},
    planFeatures: merged,
    deviceLimit,
    expiresAt: row?.expiresAt ?? null,
    endDate: row?.endDate ?? null,
    planTier: clinic?.planTier ?? 'STARTER',
    productFeatures,
  };
  return { subscription: row, planSnapshot, tenant };
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

type LoginUserRow = {
  id: string;
  email: string;
  password: string | null;
  name: string;
  role: string;
  clinicId: string;
  clinicName: string | null;
  isApproved: boolean;
  isActive: boolean;
  accountStatus?: string | null;
  sessionVersion?: number;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
  title?: string | null;
  degree?: string | null;
  specialization?: string | null;
  professionalVerified?: boolean;
};

function hasPrismaErrorCode(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if (!('code' in error)) return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code.startsWith('P');
}

async function findUserByEmailInsensitive(email: string): Promise<LoginUserRow | null> {
  const trimmed = email.trim();
  const normalizedLower = trimmed.toLowerCase();

  /** Minimal compatible shape when newer columns aren’t migrated yet or the ORM rejects the full select. */
  async function lookupMinimal(where: { email: string } | { email: { equals: string; mode: 'insensitive' } }) {
    return prismaBase.user.findFirst({
      where,
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        clinicId: true,
        clinicName: true,
      },
    });
  }

  try {
    const row = await prismaBase.user.findFirst({
      where: { email: { equals: trimmed, mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        clinicId: true,
        isApproved: true,
        isActive: true,
        clinicName: true,
        accountStatus: true,
        sessionVersion: true,
        clinicAddress: true,
        clinicPhone: true,
        title: true,
        degree: true,
        specialization: true,
        professionalVerified: true,
      },
    });
    if (!row) return null;
    return row as LoginUserRow;
  } catch (e) {
    if (isPrismaSchemaDriftError(e)) {
      console.warn('[auth] login user-query fallback due to schema drift');
    } else if (hasPrismaErrorCode(e)) {
      throw e;
    } else {
      console.warn(
        '[auth] login full user select failed — retrying minimal/compatibility path',
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  try {
    const legacy = await lookupMinimal({
      email: { equals: trimmed, mode: 'insensitive' },
    });
    if (!legacy) return null;
    return {
      ...legacy,
      isApproved: true,
      isActive: true,
      accountStatus: 'ACTIVE',
      sessionVersion: 0,
      clinicAddress: null,
      clinicPhone: null,
      title: null,
      degree: null,
      specialization: null,
      professionalVerified: false,
    };
  } catch (e) {
    if (isPrismaSchemaDriftError(e)) {
      // fall through to exact-email attempt
    } else if (hasPrismaErrorCode(e)) {
      throw e;
    } else {
      console.warn(
        '[auth] login insensitive minimal select failed — exact-email fallback',
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  try {
    const exact = await lookupMinimal({ email: normalizedLower });
    if (!exact) return null;
    return {
      ...exact,
      isApproved: true,
      isActive: true,
      accountStatus: 'ACTIVE',
      sessionVersion: 0,
      clinicAddress: null,
      clinicPhone: null,
      title: null,
      degree: null,
      specialization: null,
      professionalVerified: false,
    };
  } catch (e2) {
    console.error('[auth] login user lookup failed (all fallbacks exhausted)', e2 instanceof Error ? e2.message : e2);
    throw e2;
  }
}


/** Correlates attempts in logs without printing the full email (monitoring / incident review). */
function logFailedLoginAttempt(req: { ip?: string; socket?: { remoteAddress?: string } }, normalizedEmail: string): void {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const id = createHash('sha256').update(normalizedEmail.toLowerCase()).digest('hex').slice(0, 16);
  console.warn(`[AUTH_INVALID_LOGIN] email_hash=${id}`);
  console.warn(`[security] failed_login ip=${ip} email_hash=${id}`);
  void recordFailedLoginFraud(ip, id);
}

function logDisabledAccountAttempt(req: { ip?: string; socket?: { remoteAddress?: string } }, normalizedEmail: string): void {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const id = createHash('sha256').update(normalizedEmail.toLowerCase()).digest('hex').slice(0, 16);
  console.warn(`[AUTH_DISABLED_ACCOUNT] email_hash=${id} ip=${ip}`);
}

async function handleRegisterSaas(req: Request, res: Response): Promise<void> {
  try {
    const { email: rawEmail, password, name: nameRaw } = req.body as RegisterSaasBody;
    const email = normalizeAuthEmail(rawEmail);
    console.info(`[auth] register-saas request received email=${email || 'missing'}`);

    assertPasswordAcceptable(password, 'Password');

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const existing = await prismaBase.user.findUnique({ where: { email } });
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
    const capabilities = await resolveJwtCapabilitiesForUser({ role: user.role, clinicId: user.clinicId });
    const token = signAccessToken(user, { planSnapshot, capabilities });
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
    console.info(`[auth] register-saas success userId=${user.id} clinicId=${user.clinicId}`);
    res.status(201).json({ user, token, refreshToken, tenant });
  } catch (e: unknown) {
    console.error(`[auth] register-saas failed: ${e instanceof Error ? e.message : String(e)}`);
    if (isPrismaUniqueViolation(e)) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }
    throw e;
  }
}

/** Self-service SaaS tenant: approved immediately, receives JWT (catalog + orders APIs). */
router.post(
  '/register-saas',
  registerEmailLimiter,
  loginBruteLimiter,
  strictAuthLimiter,
  validateBody(registerSaasBodySchema),
  asyncRoute('auth.register-saas', handleRegisterSaas)
);

async function handleRegister(req: Request, res: Response): Promise<void> {
  try {
    const { email: rawEmail, password, name, clinicName, phone, title, degree } = req.body as RegisterClinicBody;
    const email = normalizeAuthEmail(rawEmail);
    console.info(`[auth] register request received email=${email || 'missing'}`);

    assertPasswordAcceptable(password, 'Password');

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const existing = await prismaBase.user.findUnique({ where: { email } });
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
          title: sanitizeTitle(title),
          degree: sanitizeDegree(degree),
          role: 'PENDING_APPROVAL',
          clinicId: clinic.id,
          isApproved: false,
          accountStatus: 'PENDING',
        },
        select: {
          id: true,
          email: true,
          name: true,
          title: true,
          degree: true,
          role: true,
          clinicName: true,
          clinicId: true,
          isApproved: true,
          accountStatus: true,
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
        'Your clinic registration was received. A platform administrator must verify your professional details, assign your role and plan, and activate your account before you can sign in.',
    });
    console.info(`[auth] register success userId=${user.id} clinicId=${user.clinicId}`);
  } catch (e: unknown) {
    console.error(`[auth] register failed: ${e instanceof Error ? e.message : String(e)}`);
    if (isPrismaUniqueViolation(e)) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }
    throw e;
  }
}

router.post(
  '/register',
  registerEmailLimiter,
  loginBruteLimiter,
  strictAuthLimiter,
  validateBody(registerClinicBodySchema),
  asyncRoute('auth.register', handleRegister)
);

async function handleLogin(req: Request, res: Response): Promise<void> {
  const loginWallMs = Date.now();
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      throw new Error('AUTH_SYSTEM_DATABASE_URL_MISSING');
    }
    if (!process.env.JWT_SECRET?.trim()) {
      throw new Error('AUTH_SYSTEM_JWT_SECRET_MISSING');
    }

    const body = req.body as LoginBody;
    const { email: rawEmail, password } = body;
    const email = normalizeAuthEmail(String(rawEmail));
    console.info(`[auth] login request received email=${email || 'missing'}`);

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await findUserByEmailInsensitive(email);
    if (!user) {
      logFailedLoginAttempt(req, email);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (typeof user.password !== 'string' || user.password.length === 0) {
      console.error('[auth.login] user password missing/corrupt', { userId: user.id });
      logFailedLoginAttempt(req, email);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    let isValid = false;
    try {
      isValid = await bcrypt.compare(password, user.password);
    } catch (e) {
      console.error('[auth.login] bcrypt compare failed', e instanceof Error ? e.message : String(e));
      res.status(500).json({ error: 'Auth failed', code: 'AUTH_COMPARE_FAILED' });
      return;
    }

    if (!isValid) {
      logFailedLoginAttempt(req, email);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      logDisabledAccountAttempt(req, email);
      res.status(403).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.isApproved) {
      res.status(403).json({
        error: 'Your registration is still pending approval by a platform administrator. You cannot sign in yet.',
      });
      return;
    }

    if (user.role !== 'SUPER_ADMIN') {
      const st = String(user.accountStatus ?? 'ACTIVE').toUpperCase();
      if (st !== 'ACTIVE') {
        res.status(403).json({
          error:
            st === 'SUSPENDED'
              ? 'This account has been suspended. Contact your clinic administrator.'
              : 'Your account is pending activation by a platform administrator.',
        });
        return;
      }
    }

    let subscription: SubscriptionWithPlan | null = null;
    let tenantBundled: SubscriptionTenantPayload | null = null;
    let planSnapshotBundled: string | undefined;
    try {
      const b = await loadLoginSubscriptionContext(user.clinicId);
      subscription = b.subscription;
      planSnapshotBundled = b.planSnapshot;
      tenantBundled = b.tenant;
    } catch (e) {
      if (isPrismaSchemaDriftError(e)) {
        console.warn('[auth] login subscription bundle fallback due to schema drift', e);
      } else {
        throw e;
      }
    }
    const skipDevice = user.role === 'SUPER_ADMIN';
    const deviceId = computeLoginDeviceId(req);
    let gate: { ok: true } | { ok: false; message: string } = { ok: true };
    try {
      gate = await assertDeviceCapacityForLogin({
        clinicId: user.clinicId,
        userId: user.id,
        deviceId,
        subscription,
        skipLimit: skipDevice,
      });
    } catch (e) {
      if (isPrismaSchemaDriftError(e)) {
        console.warn('[auth] login device capacity fallback due to schema drift', e);
      } else {
        throw e;
      }
    }
    if (!gate.ok) {
      res.status(403).json({ error: gate.message });
      return;
    }
    try {
      await recordDeviceSession(user.id, user.clinicId, deviceId);
    } catch (e) {
      if (isPrismaSchemaDriftError(e)) {
        console.warn('[auth] login recordDevice fallback due to schema drift', e);
      } else {
        throw e;
      }
    }

    let planSnapshot = planSnapshotBundled;
    let capabilities: string[] = [];
    try {
      capabilities = await resolveJwtCapabilitiesForUser({ role: user.role, clinicId: user.clinicId });
    } catch (e) {
      if (isPrismaSchemaDriftError(e)) {
        console.warn('[auth] login capabilities fallback due to schema drift', e);
      } else {
        throw e;
      }
    }
    if (!planSnapshot && subscription?.plan) {
      planSnapshot = subscription.plan;
    }
    const tokenSessionVersion = typeof user.sessionVersion === 'number' ? user.sessionVersion : 0;
    const profileExtras = {
      clinicAddress: user.clinicAddress ?? null,
      clinicPhone: user.clinicPhone ?? null,
      title: user.title ?? null,
      degree: user.degree ?? null,
      specialization: user.specialization ?? null,
      professionalVerified: Boolean(user.professionalVerified),
    };

    const token = signAccessToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        sessionVersion: tokenSessionVersion,
      },
      { planSnapshot, capabilities },
    );

    let refreshToken: string | undefined;
    try {
      refreshToken = await issueRefreshToken(user.id);
    } catch (e) {
      if (isPrismaSchemaDriftError(e)) {
        console.warn('[auth] login refresh-token fallback due to schema drift', e);
      } else {
        throw e;
      }
    }

    void logActivity({
      userId: user.id,
      clinicId: user.clinicId,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      meta: { method: 'prisma_password' },
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

    let tenant: SubscriptionTenantPayload | null = tenantBundled;
    if (!tenant && user.clinicId) {
      try {
        tenant = await subscriptionTenantPayload(user.clinicId);
      } catch (e) {
        if (isPrismaSchemaDriftError(e)) {
          console.warn('[auth] login tenant fallback due to schema drift', e);
        } else {
          throw e;
        }
      }
    }
    const loginElapsedMs = Date.now() - loginWallMs;
    console.info(`[auth] login success userId=${user.id} clinicId=${user.clinicId} durationMs=${loginElapsedMs}`);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinicName,
        clinicAddress: profileExtras.clinicAddress,
        clinicPhone: profileExtras.clinicPhone,
        title: profileExtras.title,
        degree: profileExtras.degree,
        specialization: profileExtras.specialization,
        professionalVerified: profileExtras.professionalVerified,
      },
      token,
      refreshToken,
      tenant,
    });
  } catch (err) {
    console.error('[AUTH_SYSTEM_ERROR]', err);
    const safeMsg = err instanceof Error ? err.message : String(err);
    if (process.env.DEBUG_AUTH_ERRORS === '1' && process.env.NODE_ENV !== 'production') {
      res.status(500).json({ error: safeMsg, code: 'AUTH_INTERNAL_ERROR' });
      return;
    }
    res.status(500).json({ error: 'Auth failed', code: 'AUTH_INTERNAL_ERROR' });
  }
}

async function handleAuthRefresh(req: Request, res: Response): Promise<void> {
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
  const capabilities = await resolveJwtCapabilitiesForUser({ role: row.user.role, clinicId: row.user.clinicId });
  const token = signAccessToken(row.user, { planSnapshot, capabilities });
  const tenant = await subscriptionTenantPayload(row.user.clinicId);
  res.json({
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: row.user.role,
      clinicId: row.user.clinicId,
      clinicName: row.user.clinicName,
      clinicAddress: row.user.clinicAddress,
      clinicPhone: row.user.clinicPhone,
      title: row.user.title,
      degree: row.user.degree,
      specialization: row.user.specialization,
      professionalVerified: row.user.professionalVerified,
    },
    token,
    refreshToken,
    tenant,
  });
}

router.post(
  '/login',
  loginBruteLimiter,
  strictAuthLimiter,
  validateBody(loginBodySchema),
  asyncRoute('auth.login', handleLogin)
);

router.post(
  '/refresh',
  strictAuthLimiter,
  validateBody(authRefreshBodySchema),
  asyncRoute('auth.refresh', handleAuthRefresh)
);

async function handleLogout(req: Request, res: Response): Promise<void> {
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
}

async function handleLogoutAll(req: AuthRequest, res: Response): Promise<void> {
  await revokeAllRefreshTokensForUser(req.user!.id);
  await bumpSessionVersion(req.user!.id);
  void writeAuditLog({
    userId: req.user!.id,
    action: 'LOGOUT_ALL_DEVICES',
    entityId: req.user!.id,
    metadata: {},
  });
  res.json({ success: true, message: 'All sessions revoked; sign in again on this device.' });
}

router.post(
  '/logout',
  strictAuthLimiter,
  validateBody(authLogoutBodySchema),
  asyncRoute('auth.logout', handleLogout)
);

router.post(
  '/logout-all',
  strictAuthLimiter,
  authenticate,
  validateBody(authLogoutAllBodySchema),
  asyncRoute('auth.logout-all', handleLogoutAll)
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

async function handleMe(req: AuthRequest, res: Response): Promise<void> {
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
      accountStatus: true,
      phone: true,
      clinicName: true,
      clinicAddress: true,
      clinicPhone: true,
      clinicEmail: true,
      clinicLogo: true,
      title: true,
      degree: true,
      specialization: true,
      licenseNo: true,
      professionalVerified: true,
      professionalVerifiedAt: true,
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

  let capabilities: string[];
  if (user.role === 'SUPER_ADMIN') {
    capabilities = ['*'];
  } else if (req.effectiveCapabilities !== undefined && req.effectiveCapabilities.size > 0) {
    capabilities = [...req.effectiveCapabilities];
  } else if (req.jwtCapabilities?.length) {
    capabilities = [...req.jwtCapabilities];
  } else {
    capabilities = await resolveJwtCapabilitiesForUser({ role: user.role, clinicId: user.clinicId });
  }

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
      clinicAddress: user.clinicAddress,
      clinicPhone: user.clinicPhone,
      isActive: user.isActive,
      isApproved: user.isApproved,
      accountStatus: user.accountStatus,
      title: user.title,
      degree: user.degree,
      specialization: user.specialization,
      licenseNo: user.licenseNo,
      professionalVerified: user.professionalVerified,
      professionalVerifiedAt: user.professionalVerifiedAt,
    },
    tenant,
    capabilities,
  });
}

router.get('/me', authenticate, asyncRoute('auth.me', handleMe));

router.put(
  '/profile',
  authenticate,
  validateBody(authProfileBodySchema),
  asyncRoute('auth.profile', async (req: AuthRequest, res) => {
    const body = req.body as AuthProfileBody;

    const current = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { professionalVerified: true },
    });
    if (!current) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const touchesCredentials =
      body.title !== undefined || body.degree !== undefined || body.specialization !== undefined;
    if (current.professionalVerified && touchesCredentials) {
      res.status(403).json({
        error: 'Professional title and credentials are verified and can only be changed by a platform administrator.',
      });
      return;
    }

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
        ...(body.title !== undefined ? { title: sanitizeTitle(body.title) } : {}),
        ...(body.degree !== undefined ? { degree: sanitizeDegree(body.degree) } : {}),
        ...(body.specialization !== undefined ? { specialization: sanitizeSpecialization(body.specialization) } : {}),
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
        title: true,
        degree: true,
        specialization: true,
        licenseNo: true,
        professionalVerified: true,
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
