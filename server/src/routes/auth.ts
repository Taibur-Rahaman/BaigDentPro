import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, clinicName, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        clinicName,
        phone,
      },
      select: { id: true, email: true, name: true, role: true, clinicName: true },
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicName: user.clinicName,
        clinicAddress: user.clinicAddress,
        clinicPhone: user.clinicPhone,
        degree: user.degree,
        specialization: user.specialization,
      },
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

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

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
