import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const productSchema = z.object({
  name: z.string().max(120).optional().or(z.literal('')),
  roastLevel: z.string().max(60).optional().or(z.literal('')),
  grind: z.string().max(60).optional().or(z.literal('')),
  origin: z.string().max(100).optional().or(z.literal('')),
  caffeine: z.string().max(40).optional().or(z.literal('')),
  process: z.string().max(80).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
});

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  email: z.email('Enter a valid email'),
  phoneNumber: z.string().min(3, 'Phone number is required').max(30),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['viewer', 'operator', 'manager', 'admin']),
  defaultAddress: z.string().max(200).optional().or(z.literal('')),
});

export const batchSchema = z.object({
  productId: z.string().uuid('Must be a valid product ID'),
  batchCode: z.string().min(1, 'Batch code is required').max(60),
  roastDate: z.string().min(1, 'Roast date is required'),
  expiresAt: z.string().optional(),
});

export const checkoutSchema = z.object({
  contactName: z.string().min(2, 'Enter your full name').max(120),
  contactEmail: z.email('Enter a valid email'),
  contactPhone: z.string().max(40).optional().or(z.literal('')),
  shippingAddress: z
    .string()
    .min(10, 'Enter a delivery address we can actually find')
    .max(400),
  paymentProvider: z.enum(['chapa', 'stripe']),
});

export const variantSchema = z.object({
  productId: z.string().uuid('Select a product'),
  // Registered with valueAsNumber, so these arrive as numbers already; an
  // empty input yields NaN, which the number checks reject.
  weightGrams: z
    .number({ message: 'Weight is required' })
    .int('Weight must be a whole number of grams')
    .min(1, 'Weight is required')
    .max(100000),
  // Captured from the admin as a major-unit amount (e.g. 245.00) and converted
  // to minor units before it reaches the API.
  price: z
    .number({ message: 'Price is required' })
    .min(0, 'Price cannot be negative'),
  currency: z.enum(['ETB', 'USD']),
  sku: z.string().max(60).optional().or(z.literal('')),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
