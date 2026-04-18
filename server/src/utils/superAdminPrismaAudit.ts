import type { AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../services/auditLogService.js';

/** Every `prismaBase` EMR read/write from the super-admin module must emit an audit row. */
export function auditSuperAdminPrismaBaseAccess(req: AuthRequest, operation: string): void {
  void writeAuditLog({
    userId: req.user?.id ?? 'unknown',
    clinicId: null,
    action: 'PRISMA_BASE_ACCESS',
    entityType: 'SUPER_ADMIN',
    metadata: { operation },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? null,
  });
}
