import { coreApiRequest } from '@/lib/core/coreHttpClient';

export async function coreApiHealthPing(signal?: AbortSignal): Promise<void> {
  await coreApiRequest<unknown>('/health', { signal, suppressErrorCapture: true }, true);
}

export async function coreApiDiagnosticsTenantStatus(): Promise<unknown> {
  return coreApiRequest<unknown>('/test/status');
}
