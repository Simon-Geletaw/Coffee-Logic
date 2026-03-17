import type { Product, ProductForm } from './types';
import { apiFetchJson } from '@/features/api/api-fetch';

export type ProductListFilters = Partial<{
  roastLevel: string;
  roast: string;
  grind: string;
  origin: string;
  caffeine: string;
  name: string;
  process: string;
}>;

export const getProducts = async (filters: ProductListFilters = {}): Promise<Product[]> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return apiFetchJson<Product[]>(`/admin/products/list${query ? `?${query}` : ''}`, {
    method: 'GET',
    auth: 'required',
  });
};

export const createProduct = async (form: ProductForm): Promise<void> => {
  await apiFetchJson<unknown>('/admin/products/add', {
    method: 'POST',
    body: {
      ...form,
      name: form.name.trim(),
      roastLevel: form.roastLevel?.trim() ?? '',
      grind: form.grind?.trim() ?? '',
      origin: form.origin?.trim() ?? '',
      process: form.process?.trim() ?? '',
      caffeine: form.caffeine?.trim() ?? '',
      description: form.description?.trim() ?? '',
    },
    auth: 'required',
    retries: 0,
  });
};

export const updateProduct = async (id: string, patch: Partial<ProductForm>): Promise<void> => {
  await apiFetchJson<unknown>(`/admin/products/${id}`, {
    method: 'PATCH',
    auth: 'required',
    retries: 0,
    body: {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.roastLevel !== undefined ? { roastLevel: patch.roastLevel.trim() } : {}),
      ...(patch.grind !== undefined ? { grind: patch.grind.trim() } : {}),
      ...(patch.origin !== undefined ? { origin: patch.origin.trim() } : {}),
      ...(patch.process !== undefined ? { process: patch.process.trim() } : {}),
      ...(patch.caffeine !== undefined ? { caffeine: patch.caffeine.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
    },
  });
};

export const deleteProduct = async (id: string): Promise<void> => {
  await apiFetchJson<unknown>(`/admin/products/${id}`, {
    method: 'DELETE',
    auth: 'required',
    retries: 0,
  });
};
