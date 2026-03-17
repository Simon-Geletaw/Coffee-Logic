import type { AuthRole, AuthSession } from './storage';
import { apiFetchJson } from '@/features/api/api-fetch';

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  code: number;
  message: string;
  token?: string;
};

const decodeJwtPayload = (token: string): { email?: string; role?: AuthRole } => {
  const [, payload] = token.split('.');
  if (!payload) {
    throw new Error('Invalid token payload');
  }

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const decoded = window.atob(padded);
  return JSON.parse(decoded) as { email?: string; role?: AuthRole };
};

export const loginAdmin = async (payload: LoginPayload): Promise<AuthSession> => {
  const result = await apiFetchJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
    auth: 'none',
    retries: 0,
  });

  if (result.code >= 400 || !result.token) {
    throw new Error(result.message || 'Login failed');
  }

  const decoded = decodeJwtPayload(result.token);
  if (!decoded.email || !decoded.role) {
    throw new Error('Login succeeded but token data is incomplete');
  }

  return {
    token: result.token,
    user: {
      email: decoded.email,
      role: decoded.role,
    },
  };
};
