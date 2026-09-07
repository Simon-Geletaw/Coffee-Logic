export type UserRole = 'viewer' | 'operator' | 'manager' | 'admin';

export type AuthSession = {
  token: string;
  user: {
    email: string;
    role: UserRole;
  };
  exp?: number;
};

export type Product = {
  id: string;
  name?: string;
  roastLevel?: string;
  grind?: string;
  origin?: string;
  caffeine?: string;
  process?: string;
  description?: string;
  imageUrl?: string | null;
};

export type ProductPayload = Omit<Product, 'id'>;

export type Batch = {
  id: string;
  batchCode: string;
  roastDate: string;
  expiresAt?: string | null;
  createdAt: string;
  productId: string;
  product?: { id: string; name: string };
};

export type BatchPayload = {
  productId: string;
  batchCode: string;
  roastDate: string;
  expiresAt?: string;
};

export type Inventory = {
  id: string;
  batchId: string;
  onHand: number;
  reserved: number;
  available: number;
  status: boolean;
  updatedAt: string;
  batch?: {
    id: string;
    batchCode: string;
    product: { id: string; name: string };
  };
};

export type InventoryPayload = {
  batchId: string;
  onHand: number;
};

export type InventoryAdjustPayload = {
  onHand?: number;
  reserved?: number;
};

export type UserRecord = {
  id: string;
  email: string;
  role?: UserRole | string;
  firstName?: string;
  lastName?: string;
};

/* ─── Storefront catalogue ───────────────────────────────────────────── */

export type ProductVariant = {
  id: string;
  weightGrams: number;
  priceCents: number;
  currency: string;
  sku?: string | null;
};

/** A product as the public /catalog endpoints return it: always with variants. */
export type CatalogProduct = {
  id: string;
  name: string;
  description?: string | null;
  roastLevel?: string | null;
  grind?: string | null;
  origin?: string | null;
  process?: string | null;
  caffeine?: string | null;
  imageUrl?: string | null;
  sensoryProfile?: unknown;
  variants: ProductVariant[];
};

/** Distinct filter values actually present in the catalogue. */
export type CatalogFacets = {
  roastLevel: string[];
  grind: string[];
  origin: string[];
  process: string[];
  caffeine: string[];
};

export type CatalogQuery = Partial<{
  roastLevel: string;
  grind: string;
  origin: string;
  process: string;
  caffeine: string;
  name: string;
  currency: string;
}>;

/* ─── Cart ───────────────────────────────────────────────────────────── */

export type CartItem = {
  id: string;
  productVariantId: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  weightGrams: number;
  sku?: string | null;
  product: {
    id: string;
    name: string;
    origin?: string | null;
    roastLevel?: string | null;
    grind?: string | null;
    imageUrl?: string | null;
  };
};

/** cart: editable · pending: payment session open · failed: retry allowed. */
export type CartStatus = 'cart' | 'pending' | 'failed' | 'paid' | 'refunded';

export type Cart = {
  id: string | null;
  status: CartStatus;
  currency: string | null;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  totalWeightGrams: number;
  itemCount: number;
  items: CartItem[];
  paymentProvider: string | null;
  paymentExpiresAt: string | null;
  failureReason: string | null;
  updatedAt: string | null;
};

export type AddCartItemPayload = {
  productVariantId: string;
  quantity: number;
};

export type AddCartItemResponse = {
  cartToken: string;
  cart: Cart;
};

export type PaymentProvider = 'chapa' | 'stripe';

export type CheckoutPayload = {
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  shippingAddress: string;
  paymentProvider: PaymentProvider;
};

/** Response of POST /checkout/session — send the shopper to redirectUrl. */
export type CheckoutSession = {
  orderId: string;
  provider: PaymentProvider;
  redirectUrl: string;
  expiresAt: string;
};

/** Polled by the return page until status leaves `pending`. */
export type CheckoutStatus = {
  orderId: string;
  status: CartStatus;
  paymentProvider: string | null;
  totalCents: number;
  currency: string;
  paymentExpiresAt: string | null;
  failureReason: string | null;
};

export type OrderDetail = Cart & {
  contactName: string | null;
  contactEmail: string | null;
  shippingAddress: string | null;
  paidAt: string | null;
  createdAt: string;
};

/* ─── Admin variants ─────────────────────────────────────────────────── */

export type AdminVariant = ProductVariant & {
  productId: string;
  isActive: boolean;
  product?: { id: string; name: string };
};

export type VariantPayload = {
  productId: string;
  weightGrams: number;
  priceCents: number;
  currency?: string;
  sku?: string;
  isActive?: boolean;
};

export type VariantUpdatePayload = Partial<Omit<VariantPayload, 'productId'>>;
