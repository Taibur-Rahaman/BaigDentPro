/** Thrown by `apiRequest` for non-OK responses or network/timeout failures. */
export class ApiHttpError extends Error {
  readonly status: number;

  readonly rawBody: string;

  constructor(message: string, status: number, rawBody: string) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.rawBody = rawBody;
  }
}

export function isApiHttpError(e: unknown): e is ApiHttpError {
  return e instanceof ApiHttpError;
}

/** Best-effort user-facing string from API error JSON or thrown values. */
export function parseApiErrorBody(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const j = JSON.parse(trimmed) as Record<string, unknown>;
    const err = j.error;
    const msg = j.message;
    if (typeof err === 'string' && err.trim()) return err.trim();
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  } catch {
    /* not JSON */
  }
  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
}

export function userMessageFromUnknown(e: unknown): string {
  if (isApiHttpError(e)) return e.message;
  if (e instanceof Error) {
    if (e.name === 'AbortError') {
      return 'Request timed out. Check your connection and try again.';
    }
    if (e.message === 'Failed to fetch' || e.message.includes('NetworkError')) {
      return 'Unable to reach the server. Check your network and API URL.';
    }
    return e.message;
  }
  return String(e);
}
