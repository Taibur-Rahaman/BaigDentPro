import twilio from 'twilio';

interface SMSResult {
  success: boolean;
  sid?: string;
  error?: string;
}

let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio | null {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const client = getTwilioClient();

  if (!client || !process.env.TWILIO_PHONE_NUMBER) {
    console.log('Twilio not configured. Would have sent SMS to:', to);
    console.log('Message:', message);
    console.log('To enable SMS, set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env');
    
    return {
      success: true,
      sid: 'MOCK_SID_' + Date.now(),
    };
  }

  try {
    let formattedPhone = to.replace(/\D/g, '');
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('880')) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.startsWith('0')) {
        formattedPhone = '+880' + formattedPhone.substring(1);
      } else {
        formattedPhone = '+880' + formattedPhone;
      }
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log(`SMS sent to ${formattedPhone}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error: any) {
    console.error('Failed to send SMS:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendAppointmentReminderSMS(
  phone: string,
  patientName: string,
  doctorName: string,
  clinicName: string,
  date: string,
  time: string
): Promise<SMSResult> {
  const message = `Hi ${patientName}, this is a reminder for your dental appointment with Dr. ${doctorName} on ${date} at ${time}. ${clinicName}`;
  return sendSMS(phone, message);
}

export async function sendPrescriptionSMS(
  phone: string,
  patientName: string,
  doctorName: string,
  drugs: string[]
): Promise<SMSResult> {
  const drugList = drugs.slice(0, 3).join(', ');
  const message = `Hi ${patientName}, your prescription from Dr. ${doctorName}: ${drugList}${drugs.length > 3 ? '...' : ''}. Please follow the dosage as instructed.`;
  return sendSMS(phone, message);
}

export async function sendInvoiceSMS(
  phone: string,
  patientName: string,
  invoiceNo: string,
  total: number,
  due: number
): Promise<SMSResult> {
  const message = `Hi ${patientName}, Invoice ${invoiceNo}: Total ৳${total}, Due ৳${due}. Thank you for choosing us!`;
  return sendSMS(phone, message);
}
