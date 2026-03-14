import { API_BASE_URL } from '@/features/products/constants';
import type { AuthRole, AuthSession } from './storage';

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
  const decoded = window.atob(normalized);
  return JSON.parse(decoded) as { email?: string; role?: AuthRole };
};

export const loginAdmin = async (payload: LoginPayload): Promise<AuthSession> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as LoginResponse;
  if (!response.ok || result.code >= 400 || !result.token) {
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
