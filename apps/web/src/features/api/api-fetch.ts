import { API_BASE_URL } from '@/features/products/constants';
import { clearAuthSession, getAuthorizationHeader, handleUnauthorized } from '@/features/auth/storage';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  headers?: HeadersInit;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  auth?: 'required' | 'optional' | 'none';
};

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_GET_RETRIES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jitter = (ms: number) => {
  const spread = ms * 0.18;
  return Math.max(0, Math.round(ms - spread + Math.random() * spread * 2));
};

const backoffMs = (attempt: number) => jitter(Math.min(2200, 250 * 2 ** Math.max(0, attempt - 1)));

const asJson = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

const extractMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const message = record.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  if (Array.isArray(message)) {
    const parts = message.filter((item) => typeof item === 'string') as string[];
    if (parts.length) {
      return parts.join('\n');
    }
  }

  const error = record.error;
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return null;
};

const normalizeUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/${path}`;
};

const shouldRetry = (status: number | null) => {
  if (status === null) {
    return true; // network/timeout
  }
  return status >= 500 && status <= 599;
};

export async function apiFetchJson<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const maxAttempts = method === 'GET' ? 1 + (options.retries ?? DEFAULT_GET_RETRIES) : 1;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const authMode = options.auth ?? 'none';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = new Headers(options.headers);
      if (options.body !== undefined) {
        headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
      }

      if (authMode !== 'none') {
        const authHeader = getAuthorizationHeader();
        if (authMode === 'required' && (!authHeader || !('Authorization' in authHeader))) {
          clearAuthSession();
          handleUnauthorized();
          throw new ApiError('Please sign in again.', 401);
        }
        Object.entries(authHeader).forEach(([key, value]) => headers.set(key, value));
      }

      const response = await fetch(normalizeUrl(path), {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        cache: 'no-store',
        signal: controller.signal,
      });

      if (response.status === 401) {
        clearAuthSession();
        handleUnauthorized();
        throw new ApiError('Please sign in again.', 401);
      }

      const payload = await asJson(response);
      if (!response.ok) {
        const msg =
          extractMessage(payload) ??
          (response.status === 403
            ? 'You do not have permission to access this resource.'
            : `Request failed (${response.status})`);
        throw new ApiError(msg, response.status, payload);
      }

      return payload as T;
    } catch (error) {
      const status = error instanceof ApiError ? error.status : null;
      const canRetry = method === 'GET' && attempt < maxAttempts && shouldRetry(status);
      if (!canRetry) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError('Network error. Please retry.', 0, error);
      }
      await sleep(backoffMs(attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ApiError('Request failed.', 0);
}

