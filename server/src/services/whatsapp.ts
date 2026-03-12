export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '880' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('880')) {
    formattedPhone = '880' + formattedPhone;
  }

  if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
    try {
      const response = await fetch(process.env.WHATSAPP_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: message },
        }),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      console.log(`WhatsApp message sent to ${formattedPhone}`);
    } catch (error: any) {
      console.error('WhatsApp API error:', error.message);
      throw error;
    }
  } else {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    console.log('WhatsApp Business API not configured.');
    console.log(`Manual WhatsApp link: ${whatsappUrl}`);
    console.log('To enable automatic WhatsApp, set WHATSAPP_API_URL and WHATSAPP_API_TOKEN in .env');
  }
}

export function generateWhatsAppLink(phone: string, message: string): string {
  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '880' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('880')) {
    formattedPhone = '880' + formattedPhone;
  }
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

export async function sendPrescriptionWhatsApp(
  phone: string,
  patientName: string,
  doctorName: string,
  clinicName: string,
  diagnosis: string,
  drugs: Array<{ name: string; dosage: string; frequency: string; duration: string }>
): Promise<void> {
  const drugList = drugs.map((d, i) => 
    `${i + 1}. ${d.name} ${d.dosage}\n   ${d.frequency} for ${d.duration}`
  ).join('\n');

  const message = `
*Prescription from ${clinicName}*

Patient: ${patientName}
Doctor: Dr. ${doctorName}
${diagnosis ? `Diagnosis: ${diagnosis}\n` : ''}
*Medications:*
${drugList}

Please follow the dosage as instructed.
Contact us if you have any questions.
  `.trim();

  await sendWhatsAppMessage(phone, message);
}

export async function sendInvoiceWhatsApp(
  phone: string,
  patientName: string,
  clinicName: string,
  invoiceNo: string,
  total: number,
  paid: number,
  due: number
): Promise<void> {
  const message = `
*Invoice from ${clinicName}*

Invoice No: ${invoiceNo}
Patient: ${patientName}

Total: ৳${total}
Paid: ৳${paid}
*Due: ৳${due}*

Thank you for choosing us!
  `.trim();

  await sendWhatsAppMessage(phone, message);
}

export async function sendAppointmentReminderWhatsApp(
  phone: string,
  patientName: string,
  doctorName: string,
  clinicName: string,
  date: string,
  time: string
): Promise<void> {
  const message = `
*Appointment Reminder*

Hi ${patientName},

This is a reminder for your dental appointment:

Doctor: Dr. ${doctorName}
Date: ${date}
Time: ${time}

${clinicName}

Please arrive 10 minutes early. If you need to reschedule, contact us.
  `.trim();

  await sendWhatsAppMessage(phone, message);
}
