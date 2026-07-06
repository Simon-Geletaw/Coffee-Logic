'use client';

import { SESSION_KEY } from '@/lib/config';
import type { AuthSession, UserRole } from '@/lib/types';

type JwtPayload = {
  email?: string;
  role?: UserRole;
  exp?: number;
};

function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split('.');
  if (!payload) {
    throw new Error('Invalid token');
  }

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const decoded = atob(padded);
  return JSON.parse(decoded) as JwtPayload;
}

export function createSessionFromToken(token: string): AuthSession {
  const payload = decodeJwtPayload(token);
  if (!payload.email || !payload.role) {
    throw new Error('Token payload is incomplete');
  }

  return {
    token,
    user: {
      email: payload.email,
      role: payload.role,
    },
    exp: payload.exp,
  };
}

export function saveSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.token || !parsed.user?.email || !parsed.user?.role) {
      clearSession();
      return null;
    }

    if (parsed.exp && Date.now() >= parsed.exp * 1000) {
      clearSession();
      return null;
    }

    return parsed;
  } catch {
    clearSession();
    return null;
  }
}

export function getAuthHeader(): Record<string, string> {
  const session = getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.token}` };
}
