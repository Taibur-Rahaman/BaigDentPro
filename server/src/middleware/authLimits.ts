import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { normalizeAuthEmail } from '../services/supabaseAuthSync.js';

const windowMs = 15 * 60 * 1000;

/** Unified JSON for auth rate-limit responses (login, register, register-saas). */
export const AUTH_RATE_LIMIT_MESSAGE = { error: 'Too many requests, try again later' } as const;

/** Stricter limit for credential-bearing routes; successful attempts do not consume quota. */
export const strictAuthLimiter = rateLimit({
  windowMs,
  max: Math.max(1, Number.parseInt(process.env.AUTH_STRICT_MAX ?? '30', 10) || 30),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

/** Extra-tight limit for password checks (always counts, including failures). */
export const loginBruteLimiter = rateLimit({
  windowMs,
  max: Math.max(1, Number.parseInt(process.env.AUTH_LOGIN_BRUTE_MAX ?? '20', 10) || 20),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: AUTH_RATE_LIMIT_MESSAGE,
});

/** Per-email throttle on registration (spam); falls back to IP when body has no email. */
export const registerEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Math.max(1, Number.parseInt(process.env.AUTH_REGISTER_EMAIL_MAX ?? '10', 10) || 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: AUTH_RATE_LIMIT_MESSAGE,
  keyGenerator: (req: Request): string => {
    const raw = (req.body as { email?: string } | undefined)?.email;
    const em = typeof raw === 'string' ? normalizeAuthEmail(raw) : '';
    return em || req.ip || 'unknown';
  },
});
