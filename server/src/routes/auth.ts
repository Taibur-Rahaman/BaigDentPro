import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../utils/config.js';
import { assertPasswordAcceptable } from '../utils/passwordPolicy.js';
import { sendSafeError } from '../utils/safeError.js';
import { isDatabaseUnreachableError, sendDatabaseUnavailable } from '../utils/dbUnavailable.js';
import { getSupabaseAdmin } from '../utils/supabaseServer.js';
import { normalizeAuthEmail, syncSupabasePasswordForEmail } from '../services/supabaseAuthSync.js';

// Centralized in config.ts

const router = Router();

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

router.post('/register', async (req, res) => {
  try {
    const { email: rawEmail, password, name, clinicName, phone } = req.body;
    const email = normalizeAuthEmail(String(rawEmail ?? ''));

    assertPasswordAcceptable(password, 'Password');

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // For now, each registration creates a personal clinic for the user.
    const clinic = await prisma.clinic.create({
      data: {
        name: clinicName || `${name}'s Clinic`,
        phone,
      },
    });

    const user = await prisma.user.create({
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
      },
    });

    void syncSupabasePasswordForEmail(email, password).then((r) => {
      if (!r.synced && r.note && r.note !== 'supabase_not_configured') {
        console.warn('[register] Supabase Auth sync:', r.note);
      }
    });

    // No JWT until a platform super admin approves the registration.
    res.status(201).json({
      user,
      pendingApproval: true,
      message:
        'Your clinic account was created and is pending approval. You will be able to sign in after a platform administrator approves it.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Password') || msg.includes('characters')) {
      return res.status(400).json({ error: msg });
    }
    if (isDatabaseUnreachableError(error)) {
      return sendDatabaseUnavailable(res);
    }
    return sendSafeError(res, 500, error, 'register');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = normalizeAuthEmail(String(rawEmail ?? ''));

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'This account has been disabled. Contact your clinic administrator.',
      });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        error: 'Your registration is still pending approval by a platform administrator. You cannot sign in yet.',
      });
    }

    const signOptsLogin: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
    const token = jwt.sign(
      { userId: user.id, role: user.role, clinicId: user.clinicId },
      JWT_SECRET,
      signOptsLogin
    );

    await prisma.activityLog.create({ data: { userId: user.id, action: 'LOGIN', entity: 'USER', entityId: user.id } }).catch(() => {});

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
    });
  } catch (error: unknown) {
    if (isDatabaseUnreachableError(error)) {
      return sendDatabaseUnavailable(res);
    }
    return sendSafeError(res, 500, error, 'login');
  }
});

/** Exchange a valid Supabase access token for an app JWT (user must exist in Prisma with same email). */
router.post('/supabase-session', async (req, res) => {
  try {
    const accessToken = parseBearerAccessToken(req);
    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.status(503).json({ error: 'Supabase authentication is not configured on the server' });
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(accessToken);
    if (authErr || !authData.user?.email) {
      return res.status(401).json({ error: 'Invalid or expired Supabase session' });
    }

    const user = await findUserByEmailInsensitive(authData.user.email);
    if (!user) {
      return res.status(403).json({
        error:
          'No BaigDentPro account exists for this email. Register first, or ask an administrator to link your Supabase user.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'This account has been disabled. Contact your clinic administrator.',
      });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        error: 'Your registration is still pending approval by a platform administrator. You cannot sign in yet.',
      });
    }

    const signOpts: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
    const token = jwt.sign(
      { userId: user.id, role: user.role, clinicId: user.clinicId },
      JWT_SECRET,
      signOpts
    );

    await prisma.activityLog
      .create({ data: { userId: user.id, action: 'LOGIN', entity: 'USER', entityId: user.id } })
      .catch(() => {});

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
    });
  } catch (error: unknown) {
    return sendSafeError(res, 500, error, 'supabase-session');
  }
});

/** After Supabase password recovery, keep Prisma `password` in sync so legacy API login still works. */
router.post('/sync-prisma-password', async (req, res) => {
  try {
    const accessToken = parseBearerAccessToken(req);
    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    const { password } = req.body as { password?: string };
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    assertPasswordAcceptable(password, 'Password');

    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.status(503).json({ error: 'Supabase authentication is not configured on the server' });
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(accessToken);
    if (authErr || !authData.user?.email) {
      return res.status(401).json({ error: 'Invalid or expired Supabase session' });
    }

    const user = await findUserByEmailInsensitive(authData.user.email);
    if (!user) {
      return res.status(404).json({ error: 'No BaigDentPro account for this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Password') || msg.includes('characters')) {
      return res.status(400).json({ error: msg });
    }
    return sendSafeError(res, 500, error, 'sync-prisma-password');
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
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
    res.json(user);
  } catch (error: unknown) {
    return sendSafeError(res, 500, error, 'me');
  }
});

router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, phone, clinicName, clinicAddress, clinicPhone, clinicEmail, degree, specialization, licenseNo } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name,
        phone,
        clinicName,
        clinicAddress,
        clinicPhone,
        clinicEmail,
        degree,
        specialization,
        licenseNo,
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
  } catch (error: unknown) {
    return sendSafeError(res, 500, error, 'profile');
  }
});

router.put('/password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    assertPasswordAcceptable(newPassword, 'New password');

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    void syncSupabasePasswordForEmail(user.email, newPassword).then((r) => {
      if (!r.synced && r.note && r.note !== 'supabase_not_configured') {
        console.warn('[password] Supabase Auth sync:', r.note);
      }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Password') || msg.includes('characters') || msg.includes('incorrect')) {
      const status = msg.includes('incorrect') ? 401 : 400;
      return res.status(status).json({ error: msg });
    }
    return sendSafeError(res, 500, error, 'password');
  }
});

export default router;
