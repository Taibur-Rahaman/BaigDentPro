import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validateBody.js';
import { asyncRoute } from '../utils/routeErrors.js';
import {
  inviteCreateBodySchema,
  inviteAcceptBodySchema,
  type InviteCreateBody,
  type InviteAcceptBody,
} from '../validation/schemas.js';
import { normalizeAuthEmail, syncSupabasePasswordForEmail } from '../services/supabaseAuthSync.js';
import { assertPasswordAcceptable } from '../utils/passwordPolicy.js';
import { sendStaffInviteEmail } from '../services/email.js';
import { logActivity } from '../services/clinicActivityLogService.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { isPrismaUniqueViolation } from '../utils/prismaErrors.js';

const router = Router();

function publicAppOrigin(): string {
  const raw =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.FRONTEND_URL?.split(',')[0]?.trim() ||
    'https://baigdentpro.com';
  return raw.replace(/\/+$/, '');
}

function mapInviteRoleToUserRole(inviteRole: string): string {
  if (inviteRole === 'ADMIN') return 'CLINIC_ADMIN';
  if (inviteRole === 'STORE_MANAGER') return 'STORE_MANAGER';
  return inviteRole;
}

function resolveClinicForInvite(req: AuthRequest, body: InviteCreateBody): string | null {
  if (req.user!.role === 'SUPER_ADMIN') {
    const cid = body.clinicId?.trim();
    return cid || null;
  }
  return req.businessClinicId ?? req.effectiveClinicId ?? req.user!.clinicId ?? null;
}

router.get(
  '/preview',
  asyncRoute('invite.preview', async (req, res) => {
    const q = z.object({ token: z.string().uuid() }).safeParse(req.query);
    if (!q.success) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }
    const inv = await prisma.invite.findUnique({
      where: { token: q.data.token },
      select: {
        email: true,
        expiresAt: true,
        accepted: true,
        clinic: { select: { id: true, name: true } },
        role: true,
      },
    });
    if (!inv || inv.accepted) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }
    if (inv.expiresAt.getTime() < Date.now()) {
      res.status(410).json({ error: 'Invite has expired' });
      return;
    }
    const email = inv.email;
    const at = email.indexOf('@');
    const masked =
      at <= 2 ? '***' : `${email.slice(0, 2)}***${email.slice(at)}`;
    res.json({
      ok: true,
      clinicName: inv.clinic.name,
      emailMasked: masked,
      role: inv.role,
    });
  })
);

router.post(
  '/accept',
  validateBody(inviteAcceptBodySchema),
  asyncRoute('invite.accept', async (req, res) => {
    const { token, name, password } = req.body as InviteAcceptBody;
    assertPasswordAcceptable(password, 'Password');

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { clinic: { select: { id: true, name: true, isActive: true } } },
    });
    if (!invite || invite.accepted) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }
    if (!invite.clinic.isActive) {
      res.status(403).json({ error: 'Clinic is disabled' });
      return;
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      res.status(410).json({ error: 'Invite has expired' });
      return;
    }

    const email = normalizeAuthEmail(invite.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const userRole = mapInviteRoleToUserRole(invite.role);
    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          password: hashed,
          name: name.trim().slice(0, 200),
          role: userRole,
          clinicId: invite.clinicId,
          branchId: invite.branchId,
          isApproved: true,
          accountStatus: 'ACTIVE',
          isActive: true,
          clinicName: invite.clinic.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          clinicId: true,
          isApproved: true,
          accountStatus: true,
          sessionVersion: true,
        },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { accepted: true },
      });
      return u;
    });

    void syncSupabasePasswordForEmail(email, password).then(() => {});
    void logActivity({
      userId: user.id,
      clinicId: invite.clinicId,
      action: 'USER_CREATED',
      entity: 'USER',
      entityId: user.id,
      meta: { via: 'invite', inviteRole: invite.role },
      req,
    });
    void writeAuditLog({
      userId: user.id,
      action: 'INVITE_ACCEPTED',
      entityId: user.id,
      metadata: { clinicId: invite.clinicId },
    });

    res.status(201).json({
      message: 'Account created. You can sign in now.',
      user: { id: user.id, email: user.email, name: user.name, role: user.role, clinicId: user.clinicId },
    });
  })
);

router.post(
  '/',
  requireRole('CLINIC_ADMIN', 'SUPER_ADMIN'),
  validateBody(inviteCreateBodySchema),
  asyncRoute('invite.create', async (req: AuthRequest, res) => {
    const body = req.body as InviteCreateBody;
    const clinicId = resolveClinicForInvite(req, body);
    if (!clinicId) {
      res.status(400).json({ error: 'clinicId is required for platform administrators' });
      return;
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true, isActive: true },
    });
    if (!clinic || !clinic.isActive) {
      res.status(404).json({ error: 'Clinic not found or inactive' });
      return;
    }

    if (body.branchId) {
      const br = await prisma.branch.findFirst({ where: { id: body.branchId, clinicId } });
      if (!br) {
        res.status(400).json({ error: 'Branch does not belong to this clinic' });
        return;
      }
    }

    const normalizedEmail = normalizeAuthEmail(body.email);
    if (!normalizedEmail) {
      res.status(400).json({ error: 'Invalid email' });
      return;
    }

    const dup = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (dup) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (body.expiresInDays ?? 14));

    try {
      const invite = await prisma.invite.create({
        data: {
          email: normalizedEmail,
          role: body.role,
          clinicId,
          branchId: body.branchId ?? null,
          token,
          expiresAt,
        },
        select: { id: true, email: true, role: true, expiresAt: true, clinicId: true },
      });

      const base = publicAppOrigin();
      const acceptUrl = `${base}/accept-invite?token=${encodeURIComponent(token)}`;
      await sendStaffInviteEmail(normalizedEmail, acceptUrl, clinic.name, body.role);

      res.status(201).json({
        success: true,
        invite,
        acceptUrl,
      });
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        res.status(400).json({ error: 'Invite could not be created' });
        return;
      }
      throw e;
    }
  })
);

export default router;
