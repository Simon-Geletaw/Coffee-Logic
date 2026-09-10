'use client';

import { API_BASE_URL } from '@/lib/config';
import { clearSession, getAuthHeader } from '@/lib/session';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: 'required' | 'none';
  timeoutMs?: number;
  /** Extra headers, e.g. the storefront's x-cart-token. Skipped when empty. */
  headers?: Record<string, string | undefined>;
};

export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function toUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const auth = options.auth ?? 'required';
  const timeoutMs = options.timeoutMs ?? 12_000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers({
      Accept: 'application/json',
    });

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    for (const [key, value] of Object.entries(options.headers ?? {})) {
      if (value) headers.set(key, value);
    }

    if (auth === 'required') {
      const authHeader = getAuthHeader();
      if (!authHeader.Authorization) {
        throw new HttpError('Session expired. Please log in again.', 401);
      }
      headers.set('Authorization', authHeader.Authorization);
    }

    const response = await fetch(toUrl(path), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      clearSession();
    }

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('application/json') ? ((await response.json()) as unknown) : null;

    if (!response.ok) {
      let message = 'Request failed. Please try again.';
      if (data && typeof data === 'object' && 'message' in data) {
        const apiMessage = (data as { message?: unknown }).message;
        if (typeof apiMessage === 'string' && apiMessage.trim()) {
          message = apiMessage;
        }
      }
      throw new HttpError(message, response.status);
    }

    return data as T;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError('Network error. Please retry.', 0);
  } finally {
    clearTimeout(timeout);
  }
}
