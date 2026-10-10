import { config } from '../config';

export class ApiError extends Error {
  constructor(status, code, message, fields = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    /** Field-level validation messages: [{ path: 'customer.phone', message }] */
    this.fields = fields;
  }
}

const TIMEOUT_MS = 30000;

/** JSON fetch with timeout, typed errors and same-origin staff cookies. */
export async function apiRequest(
  path,
  { method = 'GET', body, headers, signal, raw = false, cache = 'default' } = {},
) {
  if (!config.apiBaseUrl)
    throw new ApiError(503, 'not_configured', 'Ordering is not connected yet.');
  // Manual controller instead of AbortSignal.any/timeout: works on older mobile browsers.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });
  let response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache,
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      0,
      timedOut ? 'timeout' : 'network',
      timedOut
        ? 'The request took too long. Check your connection and try again.'
        : 'You appear to be offline. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = payload?.error || {};
    throw new ApiError(
      response.status,
      error.code || 'http_error',
      error.message || 'The request could not be completed.',
      error.fields || [],
    );
  }
  if (raw) return response;
  return response.status === 204 ? null : response.json();
}
