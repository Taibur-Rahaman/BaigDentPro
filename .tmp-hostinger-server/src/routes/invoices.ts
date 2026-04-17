import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { generateInvoicePDF } from '../services/pdf.js';
import { sendEmail } from '../services/email.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';

const router = Router();

async function generateInvoiceNo(): Promise<string> {
  const date = new Date();
  const prefix = `INV${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.invoice.count({
    where: { invoiceNo: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { patientId, status, startDate, endDate, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { userId: req.user!.id };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { date: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          items: true,
          _count: { select: { payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ invoices, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [totalRevenue, monthlyRevenue, pendingDue, paidThisMonth] = await Promise.all([
      prisma.invoice.aggregate({
        where: { userId: req.user!.id, status: 'PAID' },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          userId: req.user!.id,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { total: true, paid: true },
      }),
      prisma.invoice.aggregate({
        where: { userId: req.user!.id, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        _sum: { due: true },
      }),
      prisma.payment.aggregate({
        where: {
          invoice: { userId: req.user!.id },
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      totalRevenue: totalRevenue._sum.total || 0,
      monthlyRevenue: monthlyRevenue._sum.total || 0,
      pendingDue: pendingDue._sum.due || 0,
      paidThisMonth: paidThisMonth._sum.amount || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        patient: true,
        items: true,
        payments: { orderBy: { date: 'desc' } },
        user: {
          select: { name: true, clinicName: true, clinicAddress: true, clinicPhone: true, clinicEmail: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { patientId, dueDate, items, discount = 0, tax = 0, notes } = req.body;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, userId: req.user!.id },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const invoiceNo = await generateInvoiceNo();
    
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const total = subtotal - parseFloat(discount) + parseFloat(tax);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        patientId,
        userId: req.user!.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal,
        discount: parseFloat(discount),
        tax: parseFloat(tax),
        total,
        due: total,
        notes,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: parseFloat(item.unitPrice),
            total: (item.quantity || 1) * parseFloat(item.unitPrice),
          })),
        },
      },
      include: { patient: true, items: true },
    });

    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { dueDate, items, discount = 0, tax = 0, notes, status } = req.body;

    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await prisma.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });

    const subtotal = items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || existing.subtotal;
    const total = Number(subtotal) - parseFloat(discount || String(existing.discount)) + parseFloat(tax || String(existing.tax));
    const paid = Number(existing.paid);
    const due = total - paid;

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        dueDate: dueDate ? new Date(dueDate) : undefined,
        subtotal: items ? subtotal : undefined,
        discount: discount !== undefined ? parseFloat(discount) : undefined,
        tax: tax !== undefined ? parseFloat(tax) : undefined,
        total: items ? total : undefined,
        due: items ? due : undefined,
        notes,
        status,
        items: items ? {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: parseFloat(item.unitPrice),
            total: (item.quantity || 1) * parseFloat(item.unitPrice),
          })),
        } : undefined,
      },
      include: { patient: true, items: true, payments: true },
    });

    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ message: 'Invoice deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/payments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount, method = 'CASH', reference, notes } = req.body;

    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const paymentAmount = parseFloat(amount);
    const newPaid = Number(invoice.paid) + paymentAmount;
    const newDue = Number(invoice.total) - newPaid;
    const newStatus = newDue <= 0 ? 'PAID' : newDue < Number(invoice.total) ? 'PARTIAL' : invoice.status;

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: req.params.id,
          amount: paymentAmount,
          method,
          reference,
          notes,
        },
      }),
      prisma.invoice.update({
        where: { id: req.params.id },
        data: { paid: newPaid, due: Math.max(0, newDue), status: newStatus },
      }),
    ]);

    res.status(201).json(payment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/pdf', authenticate, async (req: AuthRequest, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        patient: true,
        items: true,
        payments: true,
        user: {
          select: { name: true, clinicName: true, clinicAddress: true, clinicPhone: true, clinicEmail: true, clinicLogo: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNo}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send-email', authenticate, async (req: AuthRequest, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { patient: true, items: true, user: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.patient.email) {
      return res.status(400).json({ error: 'Patient email not found' });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);
    
    await sendEmail({
      to: invoice.patient.email,
      subject: `Invoice ${invoice.invoiceNo} from ${invoice.user.clinicName || invoice.user.name}`,
      html: `
        <h2>Dear ${invoice.patient.name},</h2>
        <p>Please find your invoice attached.</p>
        <p><strong>Invoice No:</strong> ${invoice.invoiceNo}</p>
        <p><strong>Total:</strong> ৳${invoice.total}</p>
        <p><strong>Due:</strong> ৳${invoice.due}</p>
        <br>
        <p>Best regards,</p>
        <p>${invoice.user.name}</p>
        <p>${invoice.user.clinicName || ''}</p>
      `,
      attachments: [{
        filename: `invoice-${invoice.invoiceNo}.pdf`,
        content: pdfBuffer,
      }],
    });

    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { sentViaEmail: true },
    });

    res.json({ message: 'Invoice sent via email' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send-whatsapp', authenticate, async (req: AuthRequest, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { patient: true, items: true, user: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.patient.phone) {
      return res.status(400).json({ error: 'Patient phone not found' });
    }

    const itemsList = invoice.items.map(item => 
      `• ${item.description}: ৳${item.total}`
    ).join('\n');

    const message = `
*Invoice from ${invoice.user.clinicName || invoice.user.name}*

Invoice No: ${invoice.invoiceNo}
Date: ${invoice.date.toLocaleDateString()}
Patient: ${invoice.patient.name}

*Items:*
${itemsList}

Subtotal: ৳${invoice.subtotal}
${Number(invoice.discount) > 0 ? `Discount: ৳${invoice.discount}\n` : ''}Total: ৳${invoice.total}
Paid: ৳${invoice.paid}
*Due: ৳${invoice.due}*

Thank you for choosing us!
    `.trim();

    await sendWhatsAppMessage(invoice.patient.phone, message);

    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { sentViaWhatsapp: true },
    });

    res.json({ message: 'Invoice sent via WhatsApp' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
