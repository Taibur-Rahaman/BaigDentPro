import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { generatePrescriptionPDF } from '../services/pdf.js';
import { sendEmail } from '../services/email.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { patientId, startDate, endDate, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { userId: req.user!.id };
    if (patientId) where.patientId = patientId;
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { date: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true, age: true, gender: true } },
          items: true,
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    res.json({ prescriptions, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const prescription = await prisma.prescription.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        patient: true,
        items: true,
        user: {
          select: { name: true, degree: true, specialization: true, clinicName: true, clinicAddress: true, clinicPhone: true },
        },
      },
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json(prescription);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { patientId, diagnosis, chiefComplaint, examination, investigation, advice, followUpDate, vitals, items } = req.body;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, userId: req.user!.id },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        userId: req.user!.id,
        diagnosis,
        chiefComplaint,
        examination,
        investigation,
        advice,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        vitals,
        items: {
          create: items?.map((item: any) => ({
            drugName: item.drugName,
            genericName: item.genericName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            beforeFood: item.beforeFood || false,
            afterFood: item.afterFood || true,
            instructions: item.instructions,
          })) || [],
        },
      },
      include: { patient: true, items: true },
    });

    res.status(201).json(prescription);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { diagnosis, chiefComplaint, examination, investigation, advice, followUpDate, vitals, items } = req.body;

    const existing = await prisma.prescription.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    await prisma.prescriptionItem.deleteMany({ where: { prescriptionId: req.params.id } });

    const prescription = await prisma.prescription.update({
      where: { id: req.params.id },
      data: {
        diagnosis,
        chiefComplaint,
        examination,
        investigation,
        advice,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        vitals,
        items: {
          create: items?.map((item: any) => ({
            drugName: item.drugName,
            genericName: item.genericName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            beforeFood: item.beforeFood || false,
            afterFood: item.afterFood || true,
            instructions: item.instructions,
          })) || [],
        },
      },
      include: { patient: true, items: true },
    });

    res.json(prescription);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.prescription.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    await prisma.prescription.delete({ where: { id: req.params.id } });
    res.json({ message: 'Prescription deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/pdf', authenticate, async (req: AuthRequest, res) => {
  try {
    const prescription = await prisma.prescription.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        patient: true,
        items: true,
        user: {
          select: { name: true, degree: true, specialization: true, clinicName: true, clinicAddress: true, clinicPhone: true, clinicLogo: true },
        },
      },
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const pdfBuffer = await generatePrescriptionPDF(prescription);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=prescription-${prescription.id}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send-email', authenticate, async (req: AuthRequest, res) => {
  try {
    const prescription = await prisma.prescription.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { patient: true, items: true, user: true },
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (!prescription.patient.email) {
      return res.status(400).json({ error: 'Patient email not found' });
    }

    const pdfBuffer = await generatePrescriptionPDF(prescription);
    
    await sendEmail({
      to: prescription.patient.email,
      subject: `Your Prescription from ${prescription.user.clinicName || prescription.user.name}`,
      html: `
        <h2>Dear ${prescription.patient.name},</h2>
        <p>Please find your prescription attached.</p>
        <p>If you have any questions, please contact us.</p>
        <br>
        <p>Best regards,</p>
        <p>${prescription.user.name}</p>
        <p>${prescription.user.clinicName || ''}</p>
      `,
      attachments: [{
        filename: `prescription-${prescription.id}.pdf`,
        content: pdfBuffer,
      }],
    });

    await prisma.prescription.update({
      where: { id: req.params.id },
      data: { sentViaEmail: true },
    });

    await prisma.emailLog.create({
      data: {
        userId: req.user!.id,
        to: prescription.patient.email,
        subject: `Prescription from ${prescription.user.clinicName || prescription.user.name}`,
        type: 'prescription',
        status: 'sent',
      },
    });

    res.json({ message: 'Prescription sent via email' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send-whatsapp', authenticate, async (req: AuthRequest, res) => {
  try {
    const prescription = await prisma.prescription.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { patient: true, items: true, user: true },
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (!prescription.patient.phone) {
      return res.status(400).json({ error: 'Patient phone not found' });
    }

    const drugList = prescription.items.map(item => 
      `• ${item.drugName} ${item.dosage} - ${item.frequency} for ${item.duration}`
    ).join('\n');

    const message = `
*Prescription from ${prescription.user.clinicName || prescription.user.name}*

Patient: ${prescription.patient.name}
Date: ${prescription.date.toLocaleDateString()}

${prescription.diagnosis ? `Diagnosis: ${prescription.diagnosis}\n` : ''}
*Medications:*
${drugList}

${prescription.advice ? `Advice: ${prescription.advice}` : ''}
${prescription.followUpDate ? `\nFollow-up: ${prescription.followUpDate.toLocaleDateString()}` : ''}
    `.trim();

    await sendWhatsAppMessage(prescription.patient.phone, message);

    await prisma.prescription.update({
      where: { id: req.params.id },
      data: { sentViaWhatsapp: true },
    });

    res.json({ message: 'Prescription sent via WhatsApp' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
