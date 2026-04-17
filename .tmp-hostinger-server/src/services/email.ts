import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, attachments } = options;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email not configured. Would have sent:', { to, subject });
    console.log('To enable email, set SMTP_USER and SMTP_PASS in .env');
    return;
  }

  const transport = getTransporter();

  await transport.sendMail({
    from: process.env.SMTP_FROM || `BaigDentPro <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    attachments: attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
    })),
  });

  console.log(`Email sent to ${to}: ${subject}`);
}

export async function sendAppointmentConfirmation(
  email: string,
  patientName: string,
  doctorName: string,
  clinicName: string,
  date: string,
  time: string
): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0d9488; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Appointment Confirmation</h1>
      </div>
      <div style="padding: 20px; background: #f9fafb;">
        <p>Dear ${patientName},</p>
        <p>Your appointment has been confirmed with the following details:</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Clinic:</strong> ${clinicName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
        <p>Please arrive 10 minutes before your scheduled time.</p>
        <p>If you need to reschedule or cancel, please contact us.</p>
        <p>Best regards,<br>${clinicName}</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Appointment Confirmation - ${date} at ${time}`,
    html,
  });
}

export async function sendAppointmentReminder(
  email: string,
  patientName: string,
  doctorName: string,
  clinicName: string,
  date: string,
  time: string
): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f59e0b; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Appointment Reminder</h1>
      </div>
      <div style="padding: 20px; background: #f9fafb;">
        <p>Dear ${patientName},</p>
        <p>This is a reminder for your upcoming appointment:</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Clinic:</strong> ${clinicName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>${clinicName}</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Reminder: Appointment Tomorrow at ${time}`,
    html,
  });
}
