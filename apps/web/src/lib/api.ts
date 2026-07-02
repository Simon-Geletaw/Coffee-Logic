'use client';

import { requestJson } from '@/lib/http';
import { createSessionFromToken } from '@/lib/session';
import type { AuthSession, Batch, BatchPayload, Inventory, InventoryPayload, InventoryAdjustPayload, Product, ProductPayload, UserRecord } from '@/lib/types';
import type { LoginInput } from '@/lib/validators';

type LoginResponse = {
  token: string;
};

export type ProductFilters = Partial<{
  name: string;
  roastLevel: string;
  roast: string;
  grind: string;
  origin: string;
  caffeine: string;
  process: string;
}>;

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'viewer' | 'operator' | 'manager' | 'admin';
  defaultAddress?: string;
};

type UserMutationResponse = {
  status: number;
  message: string;
};

export async function login(payload: LoginInput): Promise<AuthSession> {
  const response = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    auth: 'none',
    body: payload,
  });

  if (!response.token) {
    throw new Error('Login failed');
  }

  return createSessionFromToken(response.token);
}

export function getProducts(input: string | ProductFilters = ''): Promise<Product[]> {
  const filters: ProductFilters = typeof input === 'string' ? { name: input } : input;
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(filters)) {
    if (!rawValue) continue;
    const value = String(rawValue).trim();
    if (!value) continue;
    params.set(key, value);
  }

  const suffix = params.toString();
  return requestJson<Product[]>(`/admin/products/list${suffix ? `?${suffix}` : ''}`);
}

export function createProduct(payload: ProductPayload): Promise<Product> {
  return requestJson<Product>('/admin/products/add', {
    method: 'POST',
    body: payload,
  });
}

export function updateProduct(id: string, payload: ProductPayload): Promise<Product> {
  return requestJson<Product>(`/admin/products/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteProduct(id: string): Promise<void> {
  return requestJson<void>(`/admin/products/${id}`, {
    method: 'DELETE',
  });
}

export function getUsers(): Promise<UserRecord[]> {
  return requestJson<UserRecord[]>('/users');
}

export function createUser(payload: CreateUserInput): Promise<UserMutationResponse> {
  return requestJson<UserMutationResponse>('/users', {
    method: 'POST',
    body: payload,
  });
}

export function deleteUser(id: string): Promise<UserMutationResponse> {
  return requestJson<UserMutationResponse>(`/users/${id}`, {
    method: 'DELETE',
  });
}

export function getBatches(): Promise<Batch[]> {
  return requestJson<Batch[]>('/admin/batches');
}

export function createBatch(payload: BatchPayload): Promise<Batch> {
  return requestJson<Batch>('/admin/batches', {
    method: 'POST',
    body: payload,
  });
}

export function deleteBatch(id: string): Promise<void> {
  return requestJson<void>(`/admin/batches/${id}`, {
    method: 'DELETE',
  });
}

export function getInventory(): Promise<Inventory[]> {
  return requestJson<Inventory[]>('/admin/inventory');
}

export function createInventory(payload: InventoryPayload): Promise<Inventory> {
  return requestJson<Inventory>('/admin/inventory', {
    method: 'POST',
    body: payload,
  });
}

export function adjustInventory(id: string, payload: InventoryAdjustPayload): Promise<Inventory> {
  return requestJson<Inventory>(`/admin/inventory/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteInventory(id: string): Promise<void> {
  return requestJson<void>(`/admin/inventory/${id}`, {
    method: 'DELETE',
  });
}

export function getHealth(): Promise<{ status: string }> {
  return requestJson<{ status: string }>('/health', { auth: 'none' });
}
