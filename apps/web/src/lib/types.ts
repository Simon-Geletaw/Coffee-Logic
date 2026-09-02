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
