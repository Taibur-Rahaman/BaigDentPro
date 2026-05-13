import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord } from '@/lib/core/domainShared';
import { parseCoreMessageAck, type CoreMessageAck } from '@/lib/core/coreMessageAck';

function parseLogPage<T extends Record<string, unknown>>(
  raw: unknown,
  key: 'logs' | 'items'
): { rows: T[]; page: number } {
  if (!isRecord(raw) || !Array.isArray(raw[key])) {
    return { rows: [], page: 1 };
  }
  return { rows: raw[key] as T[], page: typeof raw.page === 'number' ? raw.page : 1 };
}

export async function coreApiCommunicationSendSms(
  phone: string,
  message: string,
  type?: string
): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>('/communication/sms/send', {
    method: 'POST',
    body: { phone, message, type },
  });
  return parseCoreMessageAck(raw);
}

export async function coreApiCommunicationAppointmentReminder(appointmentId: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>('/communication/sms/appointment-reminder', {
    method: 'POST',
    body: { appointmentId },
  });
  return parseCoreMessageAck(raw);
}

export async function coreApiCommunicationBulkReminders(): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>('/communication/sms/bulk-reminder', { method: 'POST' });
  return parseCoreMessageAck(raw);
}

export async function coreApiCommunicationSmsLogs(page = 1): Promise<Record<string, unknown>> {
  return coreApiRequest<Record<string, unknown>>(`/communication/sms/logs?page=${page}`, { method: 'GET' });
}

export async function coreApiCommunicationSendEmail(
  to: string,
  subject: string,
  body: string,
  type?: string
): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>('/communication/email/send', {
    method: 'POST',
    body: { to, subject, body, type },
  });
  return parseCoreMessageAck(raw);
}

export async function coreApiCommunicationEmailLogs(page = 1): Promise<Record<string, unknown>> {
  return coreApiRequest<Record<string, unknown>>(`/communication/email/logs?page=${page}`, { method: 'GET' });
}

export async function coreApiCommunicationSendWhatsApp(phone: string, message: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>('/communication/whatsapp/send', {
    method: 'POST',
    body: { phone, message },
  });
  return parseCoreMessageAck(raw);
}

export { parseLogPage };
