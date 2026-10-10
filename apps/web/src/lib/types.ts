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

export type Cart = {
  id: string | null;
  status: string;
  currency: string | null;
  totalCents: number;
  itemCount: number;
  items: CartItem[];
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

export type PlacedOrder = {
  orderId: string;
  status: string;
  totalCents: number;
  currency: string;
  paymentProvider: string | null;
  itemCount: number;
  /** Hosted payment page returned by the selected provider. */
  checkoutUrl: string;
};

export type OrderDetail = Cart & {
  contactName: string | null;
  contactEmail: string | null;
  shippingAddress: string | null;
  paymentProvider: string | null;
  createdAt: string;
};

export type AdminOrder = {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  paymentProvider: string | null;
  paymentIntentId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  shippingAddress: string | null;
  createdAt: string;
  updatedAt: string;
  paideAt: string | null;
  user: { id: string; email: string; firstName: string; lastName: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    productVariant: {
      id: string;
      sku: string | null;
      weightGrams: number;
      product: { id: string; name: string };
    };
  }>;
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
