import PDFDocument from 'pdfkit';
import { formatProviderCredentialSuffix, formatProviderPrimaryLine } from '../utils/professionalIdentity.js';

export async function generatePrescriptionPDF(prescription: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('Helvetica-Bold').fontSize(20).text(prescription.user.clinicName || 'Medical Center', { align: 'center' });
      
      if (prescription.user.clinicAddress) {
        doc.font('Helvetica').fontSize(10).text(prescription.user.clinicAddress, { align: 'center' });
      }
      if (prescription.user.clinicPhone) {
        doc.text(`Phone: ${prescription.user.clinicPhone}`, { align: 'center' });
      }

      doc.moveDown();
      const u = prescription.user as {
        name: string;
        title?: string | null;
        degree?: string | null;
        specialization?: string | null;
      };
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(formatProviderPrimaryLine({ name: u.name, title: u.title }), { align: 'center' });

      const credLine = formatProviderCredentialSuffix(u.degree, u.specialization);
      if (credLine) {
        doc.font('Helvetica').fontSize(10).text(credLine, { align: 'center' });
      }

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      doc.font('Helvetica-Bold').fontSize(12).text('PRESCRIPTION', { align: 'center' });
      doc.moveDown();

      doc.font('Helvetica-Bold').fontSize(10).text('Patient: ', { continued: true });
      doc.font('Helvetica').text(prescription.patient.name);
      
      doc.font('Helvetica-Bold').text('Age/Gender: ', { continued: true });
      doc.font('Helvetica').text(`${prescription.patient.age || '-'} / ${prescription.patient.gender || '-'}`);
      
      doc.font('Helvetica-Bold').text('Phone: ', { continued: true });
      doc.font('Helvetica').text(prescription.patient.phone);
      
      doc.font('Helvetica-Bold').text('Date: ', { continued: true });
      doc.font('Helvetica').text(new Date(prescription.date).toLocaleDateString());

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      if (prescription.diagnosis) {
        doc.font('Helvetica-Bold').fontSize(10).text('Diagnosis: ', { continued: true });
        doc.font('Helvetica').text(prescription.diagnosis);
        doc.moveDown(0.5);
      }

      if (prescription.chiefComplaint) {
        doc.font('Helvetica-Bold').text('Chief Complaint: ', { continued: true });
        doc.font('Helvetica').text(prescription.chiefComplaint);
        doc.moveDown(0.5);
      }

      if (prescription.examination) {
        doc.font('Helvetica-Bold').text('Examination: ', { continued: true });
        doc.font('Helvetica').text(prescription.examination);
        doc.moveDown(0.5);
      }

      if (prescription.vitals) {
        const vitals = prescription.vitals as any;
        const vitalsText = [
          vitals.bp && `BP: ${vitals.bp}`,
          vitals.pulse && `Pulse: ${vitals.pulse}`,
          vitals.temp && `Temp: ${vitals.temp}`,
        ].filter(Boolean).join(' | ');
        
        if (vitalsText) {
          doc.font('Helvetica-Bold').text('Vitals: ', { continued: true });
          doc.font('Helvetica').text(vitalsText);
          doc.moveDown(0.5);
        }
      }

      doc.moveDown();
      doc.font('Helvetica-Bold').fontSize(14).text('℞', { continued: true });
      doc.fontSize(12).text(' Medications');
      doc.moveDown(0.5);

      if (prescription.items && prescription.items.length > 0) {
        prescription.items.forEach((item: any, index: number) => {
          doc.font('Helvetica-Bold').fontSize(10).text(`${index + 1}. ${item.drugName}`, { continued: true });
          if (item.genericName) {
            doc.font('Helvetica').text(` (${item.genericName})`, { continued: true });
          }
          doc.text('');
          
          doc.font('Helvetica').text(`   Dosage: ${item.dosage} | ${item.frequency} | ${item.duration}`);
          if (item.maxDailyDose) {
            doc.text(`   Max/day: ${item.maxDailyDose}`);
          }
          
          const timing = [];
          if (item.beforeFood) timing.push('Before food');
          if (item.afterFood) timing.push('After food');
          if (timing.length) {
            doc.text(`   ${timing.join(' / ')}`);
          }
          
          if (item.instructions) {
            doc.text(`   Note: ${item.instructions}`);
          }
          if (item.doctorNotes) {
            doc.text(`   Doctor notes: ${item.doctorNotes}`);
          }
          
          doc.moveDown(0.5);
        });
      }

      doc.moveDown();

      if (prescription.advice) {
        doc.font('Helvetica-Bold').fontSize(10).text('Advice: ');
        doc.font('Helvetica').text(prescription.advice);
        doc.moveDown();
      }

      if (prescription.followUpDate) {
        doc.font('Helvetica-Bold').text('Follow-up Date: ', { continued: true });
        doc.font('Helvetica').text(new Date(prescription.followUpDate).toLocaleDateString());
      }

      doc.moveDown(2);
      doc.moveTo(400, doc.y).lineTo(545, doc.y).stroke();
      doc.font('Helvetica').fontSize(10).text(`Dr. ${prescription.user.name}`, 400, doc.y + 5, { width: 145, align: 'center' });
      doc.text('Signature', 400, doc.y, { width: 145, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ====== Header: Clinic / Supplier info ======
      const clinicName = invoice.user.clinicName || 'Medical Center';
      doc.font('Helvetica-Bold').fontSize(18).text(clinicName, { align: 'center' });
      doc.moveDown(0.3);

      const headerLines: string[] = [];
      if (invoice.user.clinicAddress) headerLines.push(invoice.user.clinicAddress);
      if (invoice.user.clinicPhone) headerLines.push(`Phone: ${invoice.user.clinicPhone}`);
      if (invoice.user.clinicEmail) headerLines.push(`Email: ${invoice.user.clinicEmail}`);
      // If the clinic wants to be Mushak-compliant, they should include their BIN in clinicAddress or name.

      doc.font('Helvetica').fontSize(9);
      headerLines.forEach((line) => doc.text(line, { align: 'center' }));

      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.6);

      // ====== Mushak 6.3 Title & Meta ======
      doc.font('Helvetica-Bold').fontSize(12).text('ভ্যাট চালান পত্র (মূসক - ৬.৩)', { align: 'center' });
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(9).text('VAT TAX INVOICE (Mushak - 6.3)', { align: 'center' });
      doc.moveDown(0.8);

      const infoY = doc.y;
      doc.font('Helvetica-Bold').fontSize(9).text('Supplier (Clinic):', 50, infoY);
      doc.font('Helvetica').text(clinicName, 50, infoY + 12, { width: 230 });

      const patientBlockY = infoY;
      doc.font('Helvetica-Bold').text('Customer (Patient):', 300, patientBlockY);
      doc.font('Helvetica').text(invoice.patient.name, 300, patientBlockY + 12, { width: 230 });
      let currentY = Math.max(doc.y, patientBlockY + 28);

      doc.font('Helvetica-Bold').text('Patient Phone:', 300, currentY, { continued: true });
      doc.font('Helvetica').text(` ${invoice.patient.phone || '-'}`);
      currentY = doc.y;

      if (invoice.patient.address) {
        doc.font('Helvetica-Bold').text('Patient Address:', 300, currentY);
        doc.font('Helvetica').text(invoice.patient.address, 300, doc.y + 2, { width: 230 });
        currentY = doc.y;
      }

      let rightY = infoY;
      doc.font('Helvetica-Bold').text('Invoice No:', 50, rightY, { continued: true });
      doc.font('Helvetica').text(` ${invoice.invoiceNo}`);
      rightY = doc.y;

      doc.font('Helvetica-Bold').text('Issue Date:', 50, rightY, { continued: true });
      doc.font('Helvetica').text(` ${new Date(invoice.date).toLocaleDateString('en-BD')}`);
      rightY = doc.y;

      if (invoice.dueDate) {
        doc.font('Helvetica-Bold').text('Payment Due Date:', 50, rightY, { continued: true });
        doc.font('Helvetica').text(` ${new Date(invoice.dueDate).toLocaleDateString('en-BD')}`);
        rightY = doc.y;
      }

      doc.font('Helvetica-Bold').text('Payment Status:', 50, rightY, { continued: true });
      doc.font('Helvetica').text(` ${invoice.status}`);

      doc.moveDown(1.2);

      // ====== Item Table (Mushak-style) ======
      // We proportionally allocate VAT per line from the overall tax amount if present.
      const subtotal = Number(invoice.subtotal) || 0;
      const totalVat = Number(invoice.tax) || 0;

      const tableTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(9);

      doc.text('SL', 50, tableTop, { width: 20, align: 'center' });
      doc.text('Description of service', 75, tableTop, { width: 190 });
      doc.text('Qty', 270, tableTop, { width: 30, align: 'center' });
      doc.text('Unit Price', 305, tableTop, { width: 70, align: 'right' });
      doc.text('Value (BDT)', 380, tableTop, { width: 70, align: 'right' });
      doc.text('VAT (BDT)', 455, tableTop, { width: 65, align: 'right' });

      doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).stroke();

      let itemY = tableTop + 20;
      doc.font('Helvetica').fontSize(9);

      invoice.items.forEach((item: any, index: number) => {
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        const lineTotal = Number(item.total) || qty * unitPrice;

        let lineVat = 0;
        if (subtotal > 0 && totalVat > 0) {
          lineVat = (lineTotal / subtotal) * totalVat;
        }

        doc.text(String(index + 1), 50, itemY, { width: 20, align: 'center' });
        doc.text(item.description, 75, itemY, { width: 190 });
        doc.text(qty.toString(), 270, itemY, { width: 30, align: 'center' });
        doc.text(`৳${unitPrice.toFixed(2)}`, 305, itemY, { width: 70, align: 'right' });
        doc.text(`৳${lineTotal.toFixed(2)}`, 380, itemY, { width: 70, align: 'right' });
        doc.text(`৳${lineVat.toFixed(2)}`, 455, itemY, { width: 65, align: 'right' });

        itemY += 18;
      });

      doc.moveTo(50, itemY).lineTo(545, itemY).stroke();
      itemY += 8;

      // ====== Summary block ======
      doc.font('Helvetica').fontSize(9);
      doc.text('Subtotal (taxable value):', 330, itemY, { width: 110, align: 'right' });
      doc.text(`৳${subtotal.toFixed(2)}`, 445, itemY, { width: 75, align: 'right' });
      itemY += 14;

      const discount = Number(invoice.discount) || 0;
      if (discount > 0) {
        doc.text('Less: Discount:', 330, itemY, { width: 110, align: 'right' });
        doc.text(`-৳${discount.toFixed(2)}`, 445, itemY, { width: 75, align: 'right' });
        itemY += 14;
      }

      if (totalVat > 0) {
        doc.text('Add: VAT (Mushak 6.3):', 330, itemY, { width: 110, align: 'right' });
        doc.text(`৳${totalVat.toFixed(2)}`, 445, itemY, { width: 75, align: 'right' });
        itemY += 14;
      }

      const grandTotal = Number(invoice.total) || subtotal - discount + totalVat;

      doc.moveTo(330, itemY).lineTo(545, itemY).stroke();
      itemY += 4;

      doc.font('Helvetica-Bold').text('Grand Total Payable:', 330, itemY, { width: 110, align: 'right' });
      doc.text(`৳${grandTotal.toFixed(2)}`, 445, itemY, { width: 75, align: 'right' });
      itemY += 14;

      const paid = Number(invoice.paid) || 0;
      const due = Number(invoice.due) || Math.max(0, grandTotal - paid);

      doc.font('Helvetica').text('Amount Paid:', 330, itemY, { width: 110, align: 'right' });
      doc.text(`৳${paid.toFixed(2)}`, 445, itemY, { width: 75, align: 'right' });
      itemY += 14;

      doc.font('Helvetica-Bold').text('Amount Due:', 330, itemY, { width: 110, align: 'right' });
      doc.text(`৳${due.toFixed(2)}`, 445, itemY, { width: 75, align: 'right' });

      // ====== Notes and declarations ======
      if (invoice.notes) {
        doc.moveDown(2);
        doc.font('Helvetica-Bold').fontSize(9).text('Notes / Terms & Conditions:', 50);
        doc.font('Helvetica').fontSize(9).text(invoice.notes, 50);
      }

      doc.moveDown(1.5);
      doc.font('Helvetica').fontSize(8).text(
        'This VAT Invoice (Mushak 6.3) has been generated by BaigDentPro. ' +
          'Please ensure that supplier BIN and other regulatory fields are kept up to date in clinic settings.',
        { align: 'left' }
      );

      doc.moveDown(2);
      const signY = doc.y;
      doc.moveTo(380, signY).lineTo(545, signY).stroke();
      doc.font('Helvetica').fontSize(9).text('Authorised Signature', 380, signY + 4, {
        width: 165,
        align: 'center',
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
