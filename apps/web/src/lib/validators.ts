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
  passwordHash: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['viewer', 'operator', 'manager', 'admin']),
  defaultAddress: z.string().max(200).optional().or(z.literal('')),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
