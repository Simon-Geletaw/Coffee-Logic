import { apiFetchJson } from '@/features/api/api-fetch';

export type UserListItem = {
  email: string;
  firstName: string;
  lastName: string;
};

export type CreateUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  role: 'viewer' | 'operator' | 'manager' | 'admin';
  defaultAddress?: string;
};

type ApiCreateUserResponse = {
  status?: number;
  message?: string;
};

export async function getUsers(): Promise<UserListItem[]> {
  return apiFetchJson<UserListItem[]>('/users', { method: 'GET', auth: 'required' });
}

export async function createUser(payload: CreateUserPayload): Promise<{ message: string }> {
  const result = await apiFetchJson<ApiCreateUserResponse>('/users', {
    method: 'POST',
    auth: 'required',
    retries: 0,
    body: payload,
  });

  if (result.status !== undefined && result.status >= 400) {
    throw new Error(result.message || `Failed to create user (${result.status})`);
  }

  return { message: result.message || 'User created successfully.' };
}

