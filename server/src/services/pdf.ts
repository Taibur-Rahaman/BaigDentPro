import PDFDocument from 'pdfkit';

export async function generatePrescriptionPDF(prescription: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
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
      doc.font('Helvetica-Bold').fontSize(14).text(`Dr. ${prescription.user.name}`, { align: 'center' });
      
      if (prescription.user.degree) {
        doc.font('Helvetica').fontSize(10).text(prescription.user.degree, { align: 'center' });
      }
      if (prescription.user.specialization) {
        doc.text(prescription.user.specialization, { align: 'center' });
      }

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      doc.font('Helvetica-Bold').fontSize(12).text('PRESCRIPTION', { align: 'center' });
      doc.moveDown();

      const patientY = doc.y;
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
          
          const timing = [];
          if (item.beforeFood) timing.push('Before food');
          if (item.afterFood) timing.push('After food');
          if (timing.length) {
            doc.text(`   ${timing.join(' / ')}`);
          }
          
          if (item.instructions) {
            doc.text(`   Note: ${item.instructions}`);
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

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('Helvetica-Bold').fontSize(20).text(invoice.user.clinicName || 'Medical Center', { align: 'center' });
      
      if (invoice.user.clinicAddress) {
        doc.font('Helvetica').fontSize(10).text(invoice.user.clinicAddress, { align: 'center' });
      }
      if (invoice.user.clinicPhone) {
        doc.text(`Phone: ${invoice.user.clinicPhone}`, { align: 'center' });
      }
      if (invoice.user.clinicEmail) {
        doc.text(`Email: ${invoice.user.clinicEmail}`, { align: 'center' });
      }

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      doc.font('Helvetica-Bold').fontSize(16).text('INVOICE', { align: 'center' });
      doc.moveDown();

      const infoY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).text('Bill To:', 50, infoY);
      doc.font('Helvetica').text(invoice.patient.name, 50, infoY + 15);
      if (invoice.patient.phone) doc.text(invoice.patient.phone, 50, doc.y);
      if (invoice.patient.address) doc.text(invoice.patient.address, 50, doc.y);

      doc.font('Helvetica-Bold').text('Invoice No:', 350, infoY, { continued: true });
      doc.font('Helvetica').text(` ${invoice.invoiceNo}`);
      doc.font('Helvetica-Bold').text('Date:', 350, doc.y, { continued: true });
      doc.font('Helvetica').text(` ${new Date(invoice.date).toLocaleDateString()}`);
      if (invoice.dueDate) {
        doc.font('Helvetica-Bold').text('Due Date:', 350, doc.y, { continued: true });
        doc.font('Helvetica').text(` ${new Date(invoice.dueDate).toLocaleDateString()}`);
      }
      doc.font('Helvetica-Bold').text('Status:', 350, doc.y, { continued: true });
      doc.font('Helvetica').text(` ${invoice.status}`);

      doc.moveDown(3);

      const tableTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Description', 50, tableTop);
      doc.text('Qty', 320, tableTop, { width: 50, align: 'center' });
      doc.text('Price', 380, tableTop, { width: 70, align: 'right' });
      doc.text('Total', 460, tableTop, { width: 85, align: 'right' });

      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

      let itemY = tableTop + 25;
      doc.font('Helvetica');
      
      invoice.items.forEach((item: any) => {
        doc.text(item.description, 50, itemY, { width: 260 });
        doc.text(String(item.quantity), 320, itemY, { width: 50, align: 'center' });
        doc.text(`৳${Number(item.unitPrice).toFixed(2)}`, 380, itemY, { width: 70, align: 'right' });
        doc.text(`৳${Number(item.total).toFixed(2)}`, 460, itemY, { width: 85, align: 'right' });
        itemY += 20;
      });

      doc.moveTo(50, itemY).lineTo(545, itemY).stroke();
      itemY += 10;

      doc.font('Helvetica').text('Subtotal:', 380, itemY, { width: 70, align: 'right' });
      doc.text(`৳${Number(invoice.subtotal).toFixed(2)}`, 460, itemY, { width: 85, align: 'right' });
      itemY += 15;

      if (Number(invoice.discount) > 0) {
        doc.text('Discount:', 380, itemY, { width: 70, align: 'right' });
        doc.text(`-৳${Number(invoice.discount).toFixed(2)}`, 460, itemY, { width: 85, align: 'right' });
        itemY += 15;
      }

      if (Number(invoice.tax) > 0) {
        doc.text('Tax:', 380, itemY, { width: 70, align: 'right' });
        doc.text(`৳${Number(invoice.tax).toFixed(2)}`, 460, itemY, { width: 85, align: 'right' });
        itemY += 15;
      }

      doc.moveTo(380, itemY).lineTo(545, itemY).stroke();
      itemY += 5;

      doc.font('Helvetica-Bold').text('Total:', 380, itemY, { width: 70, align: 'right' });
      doc.text(`৳${Number(invoice.total).toFixed(2)}`, 460, itemY, { width: 85, align: 'right' });
      itemY += 15;

      doc.font('Helvetica').text('Paid:', 380, itemY, { width: 70, align: 'right' });
      doc.text(`৳${Number(invoice.paid).toFixed(2)}`, 460, itemY, { width: 85, align: 'right' });
      itemY += 15;

      doc.font('Helvetica-Bold').text('Due:', 380, itemY, { width: 70, align: 'right' });
      doc.text(`৳${Number(invoice.due).toFixed(2)}`, 460, itemY, { width: 85, align: 'right' });

      if (invoice.notes) {
        doc.moveDown(2);
        doc.font('Helvetica-Bold').fontSize(10).text('Notes:', 50);
        doc.font('Helvetica').text(invoice.notes, 50);
      }

      doc.moveDown(3);
      doc.fontSize(10).text('Thank you for choosing us!', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
