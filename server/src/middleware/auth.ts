import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { JWT_SECRET } from '../utils/config.js';
import { getSupabaseAdmin } from '../utils/supabaseServer.js';
import { normalizeAuthEmail } from '../services/supabaseAuthSync.js';
import { requireRole } from './requireRole.js';
import { isSupabaseBearerAuthAllowed } from '../utils/supabaseAuthPolicy.js';

// Centralized in config.ts

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  clinicId: string;
  isActive?: boolean;
}

/** Set by `requireActiveSubscription` for SaaS catalog / orders routes (DB is source of truth). */
export interface ClinicSubscriptionContext {
  clinicId: string;
  effectivePlan: string;
  status: string;
  features: unknown;
  expiresAt: Date | null;
  /** `Plan.features` merged with subscription `features` JSON (override wins per key). */
  mergedPlanFeatures: Record<string, unknown>;
  deviceLimit: number;
  planId: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  /** Clinic scope for this request: JWT `clinicId` after impersonation rules, else user’s clinic. */
  effectiveClinicId?: string;
  /** Set by `requireClinicScope` for business APIs (effective impersonation clinic or home clinic). */
  businessClinicId?: string;
  clinicSubscription?: ClinicSubscriptionContext;
  /** Present when JWT includes `impersonating: true` (SUPER_ADMIN clinic scope override). */
  impersonating?: boolean;
  /** Plan / tier name from JWT (`plan` claim) for tiered rate limits when subscription middleware did not run. */
  jwtPlan?: string;
}

/** Bearer `Authorization` or `X-BaigDentPro-Token` (same value as browser `localStorage['baigdentpro:token']`). */
export function extractAccessTokenFromRequest(req: Request): string | null {
  const authHeader = req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const t = authHeader.slice(7).trim();
    if (t) return t;
  }
  const alt = req.header('X-BaigDentPro-Token')?.trim();
  if (alt) return alt;
  return null;
}

type SupabaseBearerResult =
  | { ok: true; user: AuthUser }
  | { ok: false; status: 401 | 403; error: string };

async function resolveUserFromSupabaseAccessToken(token: string): Promise<SupabaseBearerResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authData.user?.email) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizeAuthEmail(authData.user.email), mode: 'insensitive' } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      clinicId: true,
      isActive: true,
      isApproved: true,
      sessionVersion: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      status: 403,
      error:
        'No BaigDentPro account exists for this email. Register first, or ask an administrator to link your Supabase user.',
    };
  }

  if (!user.isActive) {
    return {
      ok: false,
      status: 403,
      error: 'Your account access has been disabled. Contact your clinic administrator.',
    };
  }

  if (!user.isApproved) {
    return {
      ok: false,
      status: 403,
      error: 'Your account is not approved yet. Contact your platform administrator.',
    };
  }

  if (!user.clinicId) {
    return {
      ok: false,
      status: 403,
      error: 'Account is missing clinic assignment. Contact support.',
    };
  }

  const meta = authData.user.app_metadata as Record<string, unknown> | undefined;
  const rawSv = meta?.session_version;
  const parsed =
    typeof rawSv === 'number' && Number.isFinite(rawSv)
      ? rawSv
      : typeof rawSv === 'string'
        ? Number.parseInt(rawSv, 10)
        : undefined;
  const metaSv = typeof parsed === 'number' && !Number.isNaN(parsed) ? parsed : undefined;
  if (metaSv === undefined) {
    if (user.sessionVersion !== 0) {
      return { ok: false, status: 403, error: 'Session is outdated' };
    }
  } else if (metaSv !== user.sessionVersion) {
    return { ok: false, status: 403, error: 'Session is outdated' };
  }

  return { ok: true, user: user as AuthUser };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractAccessTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as {
        userId?: string;
        email?: string;
        clinicId?: string;
        plan?: string;
        impersonating?: boolean;
        impersonatedBy?: string;
        impersonationJti?: string;
        role?: string;
        sessionVersion?: number;
      };

      if (!decoded.userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          clinicId: true,
          isActive: true,
          isApproved: true,
          sessionVersion: true,
        },
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const tokenSessionVersion = typeof decoded.sessionVersion === 'number' ? decoded.sessionVersion : 0;
      if (tokenSessionVersion !== user.sessionVersion) {
        return res.status(403).json({ error: 'Session is outdated' });
      }

      if (typeof decoded.role === 'string' && decoded.role.length > 0 && decoded.role !== user.role) {
        return res.status(403).json({ error: 'Session is outdated' });
      }

      if (decoded.email && user.email && decoded.email.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      if (decoded.impersonating === true && user.role === 'SUPER_ADMIN') {
        if (
          typeof decoded.impersonatedBy === 'string' &&
          decoded.impersonatedBy.length > 0 &&
          decoded.impersonatedBy !== user.id
        ) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }

      const tokenClinic = decoded.clinicId?.trim() || '';
      let effectiveClinicId = user.clinicId;
      if (tokenClinic && tokenClinic !== user.clinicId) {
        if (decoded.impersonating === true && user.role === 'SUPER_ADMIN') {
          effectiveClinicId = tokenClinic;
        } else {
          return res.status(401).json({ error: 'Invalid token' });
        }
      } else if (tokenClinic && tokenClinic === user.clinicId) {
        effectiveClinicId = user.clinicId;
      }

      if (decoded.impersonating === true && user.role === 'SUPER_ADMIN') {
        const jti = typeof decoded.impersonationJti === 'string' ? decoded.impersonationJti.trim() : '';
        if (!jti) {
          return res.status(401).json({ error: 'Invalid impersonation token' });
        }
        const sess = await prisma.impersonationSession.findFirst({
          where: {
            jti,
            actorUserId: user.id,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        });
        if (!sess || sess.targetClinicId !== effectiveClinicId) {
          return res.status(403).json({ error: 'Impersonation session expired or revoked' });
        }
      }

      if (!user.isActive) {
        return res.status(403).json({
          error: 'Your account access has been disabled. Contact your clinic administrator.',
        });
      }

      if (!user.isApproved) {
        return res.status(403).json({
          error: 'Your account is not approved yet. Contact your platform administrator.',
        });
      }

      req.impersonating = decoded.impersonating === true && user.role === 'SUPER_ADMIN';
      req.effectiveClinicId = effectiveClinicId;
      req.user = user as AuthUser;
      req.jwtPlan = typeof decoded.plan === 'string' && decoded.plan.trim() ? decoded.plan.trim() : undefined;
      return next();
    } catch (jwtErr: unknown) {
      const name = jwtErr instanceof Error ? jwtErr.name : '';
      if (name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
    }

    if (!isSupabaseBearerAuthAllowed()) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const sb = await resolveUserFromSupabaseAccessToken(token);
    if (!sb.ok) {
      return res.status(sb.status).json({ error: sb.error });
    }

    req.effectiveClinicId = sb.user.clinicId;
    req.user = sb.user;
    return next();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Auth error:', message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractAccessTokenFromRequest(req);
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as {
        userId?: string;
        clinicId?: string;
        sessionVersion?: number;
        impersonating?: boolean;
      };
      if (decoded.userId) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            clinicId: true,
            isActive: true,
            isApproved: true,
            sessionVersion: true,
          },
        });
        const tokenSessionVersion = typeof decoded.sessionVersion === 'number' ? decoded.sessionVersion : 0;
        if (
          user?.isActive &&
          user?.isApproved &&
          tokenSessionVersion === user.sessionVersion &&
          (!decoded.clinicId || !user.clinicId || decoded.clinicId === user.clinicId) &&
          decoded.impersonating !== true
        ) {
          req.user = user as AuthUser;
        }
      }
    }
  } catch (error: any) {
    console.error('Optional auth error:', error.message);
  }
  next();
};

export const requireAuth = authenticate;

/** Clinic + platform admins (same as `requireRole('ADMIN')`). */
export const requireAdmin = requireRole('ADMIN');

/** Platform super admin only. */
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

