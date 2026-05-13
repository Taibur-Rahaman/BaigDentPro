import { isRecord } from '@/lib/core/domainShared';

/** Success bodies like `{ message: string }` from POST/DELETE endpoints. */
export type CoreMessageAck = { message: string };

export function parseCoreMessageAck(raw: unknown): CoreMessageAck {
  if (!isRecord(raw) || typeof raw.message !== 'string' || !raw.message.trim()) {
    return { message: 'OK' };
  }
  return { message: raw.message };
}

/** When server returns `{ success?: boolean }` or bare ack. */
export type CoreOkAck = { ok: boolean };

export function parseCoreOkAck(raw: unknown): CoreOkAck {
  if (isRecord(raw) && raw.ok === true) return { ok: true };
  return { ok: false };
}
