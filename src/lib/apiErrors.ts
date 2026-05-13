import {
  HTML_API_ERROR,
  INVALID_LOGIN_HOST_ERROR,
  LOGIN_RETURNED_HTML_ERROR,
} from '@/config/api';

const INVALID_JSON_BODY =
  'The server returned an invalid JSON body. If this persists, check the API URL and response shape.';

/** Thrown when OK JSON was expected but parsing failed (canonical client transport). */
export class SafeApiJsonParseError extends Error {
  readonly requestUrl: string;

  readonly statusCode: number;

  readonly rawText: string;

  constructor(url: string, statusCode: number, rawText: string) {
    super(INVALID_JSON_BODY);
    this.name = 'SafeApiJsonParseError';
    this.requestUrl = url;
    this.statusCode = statusCode;
    this.rawText = rawText;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown by {@link coreApiRequest} for non-OK responses or network/timeout failures. */
export class ApiHttpError extends Error {
  readonly status: number;

  readonly rawBody: string;

  readonly endpoint?: string;

  constructor(message: string, status: number, rawBody: string, endpoint?: string) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.rawBody = rawBody;
    this.endpoint = endpoint;
  }
}

export function isApiHttpError(e: unknown): e is ApiHttpError {
  return e instanceof ApiHttpError;
}

/** Login URL must use the pinned API host. */
export class InvalidLoginHostError extends Error {
  override readonly name = 'InvalidLoginHostError';

  constructor() {
    super(INVALID_LOGIN_HOST_ERROR);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Login response looked like HTML (wrong URL or proxy returning SPA shell). */
export class LoginReturnedHtmlError extends Error {
  override readonly name = 'LoginReturnedHtmlError';

  constructor() {
    super(LOGIN_RETURNED_HTML_ERROR);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Login path expected `application/json` but content-type/body disagreed (or body was malformed). */
export class LoginExpectedJsonBodyError extends Error {
  override readonly name = 'LoginExpectedJsonBodyError';

  constructor() {
    super('LOGIN_EXPECTED_JSON_BODY');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Successful HTTP login but empty body — cannot mint client session. */
export class LoginEmptySuccessBodyError extends Error {
  override readonly name = 'LoginEmptySuccessBodyError';

  constructor() {
    super('LOGIN_EMPTY_SUCCESS_BODY');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type LoginErrorKind =
  | 'invalid_credentials'
  | 'connection'
  | 'server_error'
  | 'unknown';

function classifyLoginError(e: unknown): {
  kind: LoginErrorKind;
  status?: number;
  message?: string;
} {
  if (isApiHttpError(e)) {
    const s = e.status;
    if (s === 401 || s === 404) return { kind: 'invalid_credentials', status: s };
    if (s >= 500) return { kind: 'server_error', status: s };
    if (s === 0) return { kind: 'connection', status: s, message: e.message };
    return { kind: 'invalid_credentials', status: s };
  }
  if (
    e instanceof InvalidLoginHostError ||
    e instanceof LoginReturnedHtmlError ||
    e instanceof LoginExpectedJsonBodyError ||
    e instanceof LoginEmptySuccessBodyError
  ) {
    return { kind: 'connection', message: e.message };
  }
  if (e instanceof SafeApiJsonParseError) {
    return { kind: 'connection', message: e.message };
  }
  if (e instanceof Error && e.message === HTML_API_ERROR) {
    return { kind: 'connection', message: e.message };
  }
  if (e instanceof TypeError) {
    return { kind: 'connection', message: e.message };
  }
  if (e instanceof Error && e.name === 'AbortError') {
    return { kind: 'connection', message: e.message };
  }
  if (e instanceof Error && /Load failed|NetworkError|ERR_NETWORK|fetch failed|network request/i.test(e.message)) {
    return { kind: 'connection', message: e.message };
  }
  return { kind: 'unknown', message: e instanceof Error ? e.message : String(e) };
}

/**
 * Canonical Prisma JWT login UX copy (classification only — no reliance on ApiHttpError.message for routing).
 */
/** Sole UX mapping for JWT email/password login — call sites must not re-map or overlay messages. */
export function loginErrorMessageForUser(e: unknown): string {
  const networkLike =
    e instanceof Error && /Load failed|NetworkError|ERR_NETWORK|fetch failed|network request/i.test(e.message);
  if (networkLike) {
    return 'Unable to reach the server. Check your network and API URL.';
  }
  if (isApiHttpError(e)) {
    const parsed = parseApiErrorBody(e.rawBody);
    if (parsed) return parsed;
    if (e.message?.trim()) return e.message.trim();
  }
  if (e instanceof Error && e.message?.trim()) {
    return e.message.trim();
  }

  const classified = classifyLoginError(e);

  console.debug('[LOGIN ERROR CLASSIFIED]', {
    type: classified.kind,
    status: classified.status,
    message:
      classified.message ?? (e instanceof Error ? e.message : typeof e === 'string' ? e : undefined),
  });

  let userMessage: string;
  switch (classified.kind) {
    case 'invalid_credentials':
      userMessage = 'Invalid credentials';
      break;
    case 'connection':
      userMessage = classified.message
        ? `Network error: ${classified.message}`
        : 'Network error: unable to reach the API server';
      break;
    case 'server_error':
      userMessage = `Server error (${classified.status ?? 500})`;
      break;
    default:
      userMessage = 'Invalid credentials';
      break;
  }

  console.assert(typeof userMessage === 'string', '[LOGIN ERROR PIPELINE BROKEN]');
  return userMessage;
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
    if (/Load failed|NetworkError|ERR_NETWORK|fetch failed|network request/i.test(e.message)) {
      return 'Unable to reach the server. Check your network and API URL.';
    }
    return e.message;
  }
  return String(e);
}
