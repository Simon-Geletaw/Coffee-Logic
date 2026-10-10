'use client';

import { requestJson } from '@/lib/http';
import { createSessionFromToken } from '@/lib/session';
import { clearCartToken, getCartToken, saveCartToken } from '@/lib/cart-token';
import type {
  AddCartItemPayload,
  AddCartItemResponse,
  AdminOrder,
  AdminVariant,
  AuthSession,
  Batch,
  BatchPayload,
  Cart,
  CatalogFacets,
  CatalogProduct,
  CatalogQuery,
  CheckoutPayload,
  Inventory,
  InventoryPayload,
  InventoryAdjustPayload,
  OrderDetail,
  PlacedOrder,
  Product,
  ProductPayload,
  UserRecord,
  VariantPayload,
  VariantUpdatePayload,
} from '@/lib/types';
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

export function getAdminOrders(filters: {
  status?: string;
  paymentProvider?: string;
} = {}): Promise<AdminOrder[]> {
  return requestJson<AdminOrder[]>(
    `/admin/orders${toQueryString(filters)}`,
  );
}

export function getAdminOrder(id: string): Promise<AdminOrder> {
  return requestJson<AdminOrder>(`/admin/orders/${encodeURIComponent(id)}`);
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

/* ─── Storefront catalogue (public — no session required) ────────────── */

function toQueryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(params)) {
    const value = rawValue?.trim();
    if (value) search.set(key, value);
  }
  const suffix = search.toString();
  return suffix ? `?${suffix}` : '';
}

export function getCatalogProducts(query: CatalogQuery = {}): Promise<CatalogProduct[]> {
  return requestJson<CatalogProduct[]>(`/catalog/products${toQueryString(query)}`, {
    auth: 'none',
  });
}

export function getCatalogProduct(id: string): Promise<CatalogProduct> {
  return requestJson<CatalogProduct>(`/catalog/products/${id}`, { auth: 'none' });
}

export function getCatalogFacets(): Promise<CatalogFacets> {
  return requestJson<CatalogFacets>('/catalog/products/facets', { auth: 'none' });
}

/* ─── Cart (public, keyed by the x-cart-token header) ────────────────── */

function cartHeaders(): Record<string, string | undefined> {
  return { 'x-cart-token': getCartToken() ?? undefined };
}

export function getCart(): Promise<Cart> {
  return requestJson<Cart>('/cart', { auth: 'none', headers: cartHeaders() });
}

export async function addCartItem(payload: AddCartItemPayload): Promise<Cart> {
  const response = await requestJson<AddCartItemResponse>('/cart/items', {
    method: 'POST',
    auth: 'none',
    headers: cartHeaders(),
    body: payload,
  });

  // The first add mints the token; persisting it here keeps every later
  // request pointed at the same cart row.
  if (response.cartToken) {
    saveCartToken(response.cartToken);
  }

  return response.cart;
}

export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return requestJson<Cart>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    auth: 'none',
    headers: cartHeaders(),
    body: { quantity },
  });
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return requestJson<Cart>(`/cart/items/${itemId}`, {
    method: 'DELETE',
    auth: 'none',
    headers: cartHeaders(),
  });
}

export function clearCart(): Promise<Cart> {
  return requestJson<Cart>('/cart', {
    method: 'DELETE',
    auth: 'none',
    headers: cartHeaders(),
  });
}

export async function checkout(payload: CheckoutPayload): Promise<PlacedOrder> {
  const order = await requestJson<PlacedOrder>('/cart/checkout', {
    timeoutMs: 60_000,
    method: 'POST',
    auth: 'none',
    headers: cartHeaders(),
    body: payload,
  });

  // The server releases the token on checkout, so the browser must drop it too
  // or the next visit would query a cart that no longer exists.
  clearCartToken();

  return order;
}

export function getOrder(id: string): Promise<OrderDetail> {
  return requestJson<OrderDetail>(`/cart/orders/${id}`, { auth: 'none' });
}

export type ChapaVerifyResult = {
  orderId: string | null;
  status: 'paid' | 'pending' | 'failed' | 'unknown';
};

/** Ask the API to confirm a Chapa transaction directly with Chapa. */
export function verifyChapaPayment(txRef: string): Promise<ChapaVerifyResult> {
  return requestJson<ChapaVerifyResult>(
    `/payments/chapa/verify/${encodeURIComponent(txRef)}`,
    { auth: 'none', timeoutMs: 25_000 },
  );
}

/* ─── Admin: product variants ────────────────────────────────────────── */

export function getVariants(productId?: string): Promise<AdminVariant[]> {
  return requestJson<AdminVariant[]>(
    `/admin/variants${toQueryString({ productId })}`,
  );
}

export function createVariant(payload: VariantPayload): Promise<AdminVariant> {
  return requestJson<AdminVariant>('/admin/variants', {
    method: 'POST',
    body: payload,
  });
}

export function updateVariant(
  id: string,
  payload: VariantUpdatePayload,
): Promise<AdminVariant> {
  return requestJson<AdminVariant>(`/admin/variants/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteVariant(id: string): Promise<void> {
  return requestJson<void>(`/admin/variants/${id}`, { method: 'DELETE' });
}

export function verifyStripePayment(sessionId: string): Promise<ChapaVerifyResult> {
  return requestJson<ChapaVerifyResult>(`/payments/stripe/verify/${encodeURIComponent(sessionId)}`, { auth: 'none', timeoutMs: 45_000 });
}
