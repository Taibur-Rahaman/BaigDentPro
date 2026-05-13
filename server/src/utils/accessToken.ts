import jwt, { type SignOptions } from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from './config.js';

export type AccessTokenUser = {
  id: string;
  email: string;
  role: string;
  clinicId: string | null;
  sessionVersion: number;
};

export type SignAccessTokenOptions = {
  /** Cached subscription tier for UX only; server always re-checks DB. */
  planSnapshot?: string;
  /** Effective capability vocabulary for fast route checks (`*` for SUPER_ADMIN). */
  capabilities?: string[];
  expiresIn?: SignOptions['expiresIn'];
  impersonating?: boolean;
  /** Server-issued impersonation session id (must match `ImpersonationSession.jti`). */
  impersonationJti?: string;
  /** SUPER_ADMIN impersonation: actor id (must match `user.id`); audited in `impersonatedBy` JWT claim. */
  impersonatedBy?: string;
  /** SUPER_ADMIN impersonation: JWT clinic scope differs from the user’s home clinic. */
  clinicIdOverride?: string | null;
};

export function signAccessToken(user: AccessTokenUser, options?: SignAccessTokenOptions): string {
  const signOpts: SignOptions = {
    expiresIn: (options?.expiresIn ?? JWT_EXPIRES_IN) as SignOptions['expiresIn'],
  };
  const clinicId = options?.clinicIdOverride ?? user.clinicId ?? '';
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      clinicId,
      sessionVersion: user.sessionVersion,
      ...(options?.planSnapshot ? { plan: options.planSnapshot } : {}),
      ...(options?.capabilities?.length ? { capabilities: options.capabilities } : {}),
      ...(options?.impersonating
        ? {
            impersonating: true,
            ...(options.impersonationJti ? { impersonationJti: options.impersonationJti } : {}),
            ...(options.impersonatedBy ? { impersonatedBy: options.impersonatedBy } : {}),
          }
        : {}),
    },
    JWT_SECRET,
    signOpts
  );
}
