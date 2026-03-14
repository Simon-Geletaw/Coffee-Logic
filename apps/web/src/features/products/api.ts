import { API_BASE_URL } from './constants';
import type { Product, ProductForm } from './types';
import { getAuthorizationHeader } from '@/features/auth/storage';

type UpdateProductResponse = {
  name?: string;
  roastLevel?: string;
  grind?: string;
  origin?: string;
  process?: string;
  caffeine?: string;
};

export const getProducts = async (roast?: string): Promise<Product[]> => {
  const params = new URLSearchParams();
  if (roast) {
    params.set('roast', roast);
  }

  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/admin/products/list${query ? `?${query}` : ''}`, {
    cache: 'no-store',
    headers: {
      ...getAuthorizationHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Please sign in again.' : response.status === 403 ? 'Your account does not have product access.' : `Products API failed: ${response.status}`);
  }

  return response.json() as Promise<Product[]>;
};

export const createProduct = async (form: ProductForm): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/products/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: JSON.stringify({
      ...form,
      name: form.name.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Please sign in again.' : response.status === 403 ? 'Only administrators can create products.' : `Failed to create product (${response.status})`);
  }
};

export const updateProduct = async (id: string, form: ProductForm): Promise<UpdateProductResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: JSON.stringify({
      ...form,
      name: form.name.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Please sign in again.' : response.status === 403 ? 'Only administrators can update products.' : `Failed to update product (${response.status})`);
  }

  return response.json() as Promise<UpdateProductResponse>;
};
export const deleteProduct = async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
      method: 'DELETE',
      headers: {
        ...getAuthorizationHeader(),
      },
    }); 
    if(!response.ok) {
        throw new Error(response.status === 401 ? 'Please sign in again.' : response.status === 403 ? 'Only administrators can archive products.' : `Failed to delete product (${response.status})`);
    }
};