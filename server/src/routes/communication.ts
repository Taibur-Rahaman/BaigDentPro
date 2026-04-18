import { Router } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveBusinessClinicId } from '../utils/requestClinic.js';
import { sendSMS } from '../services/sms.js';
import { sendEmail } from '../services/email.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';

const router = Router();

const commUserScope = (req: AuthRequest) => ({ user: { clinicId: resolveBusinessClinicId(req) } });

router.post('/sms/send', async (req: AuthRequest, res) => {
  try {
    const { phone, message, type = 'custom' } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }

    const result = await sendSMS(phone, message);

    await prisma.smsLog.create({
      data: {
        userId: req.user!.id,
        phone,
        message,
        type,
        status: result.success ? 'sent' : 'failed',
        twilioSid: result.sid,
        error: result.error,
      },
    });

    if (result.success) {
      res.json({ message: 'SMS sent successfully', sid: result.sid });
    } else {
      res.status(500).json({ error: result.error || 'Failed to send SMS' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sms/appointment-reminder', async (req: AuthRequest, res) => {
  try {
    const { appointmentId } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { clinicId: resolveBusinessClinicId(req) } },
      include: { patient: true, user: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const message = `Reminder: Your dental appointment with Dr. ${appointment.user.name} is on ${appointment.date.toLocaleDateString()} at ${appointment.time}. ${appointment.user.clinicName || ''} ${appointment.user.clinicPhone ? `Contact: ${appointment.user.clinicPhone}` : ''}`;

    const result = await sendSMS(appointment.patient.phone, message);

    await prisma.smsLog.create({
      data: {
        userId: req.user!.id,
        phone: appointment.patient.phone,
        message,
        type: 'appointment_reminder',
        status: result.success ? 'sent' : 'failed',
        twilioSid: result.sid,
        error: result.error,
      },
    });

    if (result.success) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { reminderSent: true, reminderSentAt: new Date() },
      });
      res.json({ message: 'Reminder sent successfully' });
    } else {
      res.status(500).json({ error: result.error || 'Failed to send reminder' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sms/bulk-reminder', async (req: AuthRequest, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        patient: { clinicId: resolveBusinessClinicId(req) },
        date: { gte: tomorrow, lt: dayAfter },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        reminderSent: false,
      },
      include: { patient: true, user: true },
    });

    let sent = 0;
    let failed = 0;

    for (const appointment of appointments) {
      const message = `Reminder: Your dental appointment with Dr. ${appointment.user.name} is tomorrow at ${appointment.time}. ${appointment.user.clinicName || ''}`;

      const result = await sendSMS(appointment.patient.phone, message);

      await prisma.smsLog.create({
        data: {
          userId: req.user!.id,
          phone: appointment.patient.phone,
          message,
          type: 'appointment_reminder',
          status: result.success ? 'sent' : 'failed',
          twilioSid: result.sid,
          error: result.error,
        },
      });

      if (result.success) {
        sent++;
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminderSent: true, reminderSentAt: new Date() },
        });
      } else {
        failed++;
      }
    }

    res.json({ message: `Sent ${sent} reminders, ${failed} failed`, sent, failed, total: appointments.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sms/logs', async (req: AuthRequest, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.smsLog.findMany({
        where: commUserScope(req),
        skip,
        take: parseInt(limit as string),
        orderBy: { sentAt: 'desc' },
      }),
      prisma.smsLog.count({ where: commUserScope(req) }),
    ]);

    res.json({ logs, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/email/send', async (req: AuthRequest, res) => {
  try {
    const { to, subject, body, type = 'custom' } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'To, subject, and body are required' });
    }

    await sendEmail({ to, subject, html: body });

    await prisma.emailLog.create({
      data: {
        userId: req.user!.id,
        to,
        subject,
        body,
        type,
        status: 'sent',
      },
    });

    res.json({ message: 'Email sent successfully' });
  } catch (error: any) {
    await prisma.emailLog.create({
      data: {
        userId: req.user!.id,
        to: req.body.to,
        subject: req.body.subject,
        body: req.body.body,
        type: req.body.type || 'custom',
        status: 'failed',
        error: error.message,
      },
    });
    res.status(500).json({ error: error.message });
  }
});

router.get('/email/logs', async (req: AuthRequest, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where: commUserScope(req),
        skip,
        take: parseInt(limit as string),
        orderBy: { sentAt: 'desc' },
      }),
      prisma.emailLog.count({ where: commUserScope(req) }),
    ]);

    res.json({ logs, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/whatsapp/send', async (req: AuthRequest, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }

    await sendWhatsAppMessage(phone, message);
    res.json({ message: 'WhatsApp message sent' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
