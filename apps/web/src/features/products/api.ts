import { API_BASE_URL } from './constants';
import type { Product, ProductForm } from './types';

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
  });

  if (!response.ok) {
    throw new Error(`Products API failed: ${response.status}`);
  }

  return response.json() as Promise<Product[]>;
};

export const createProduct = async (form: ProductForm): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/products/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...form,
      name: form.name.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create product (${response.status})`);
  }
};

export const updateProduct = async (id: string, form: ProductForm): Promise<UpdateProductResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...form,
      name: form.name.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update product (${response.status})`);
  }

  return response.json() as Promise<UpdateProductResponse>;
};
