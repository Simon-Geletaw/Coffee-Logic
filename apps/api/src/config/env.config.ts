import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();
const envSchema = z.object({
  JWT_SECRET: z
    .string()
    .nonempty('JWT_SECRET is required')
    .length(64, 'JWT_SECRET must be exactly 32 characters long'),
  DATABASE_URL: z
    .string()
    .nonempty('DATABASE_URL is required')
    .startsWith(
      'postgresql://',
      'DATABASE_URL must start with "postgresql://"',
    ),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export const validate = () => {
  const env = envSchema.safeParse(process.env);
  if (!env.success) {
    console.error('Invalid environment variables:', env.error.format());
    throw new Error('Invalid environment variables');
  }
  return env.data;
};
export type EnvConfig = z.infer<typeof envSchema>;
