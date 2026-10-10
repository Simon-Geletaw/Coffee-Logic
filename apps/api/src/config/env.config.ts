import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Every environment variable the API reads, validated once at boot.
 *
 * Fail fast: a missing or malformed value stops the process before it can
 * accept a request, instead of surfacing as a 500 on the first checkout.
 *
 * Payment and Redis settings are optional outside production so unit tests
 * and a fresh clone still boot; in production every one of them is required.
 */
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(3001),

    DATABASE_URL: z
      .string()
      .nonempty('DATABASE_URL is required')
      .startsWith(
        'postgresql://',
        'DATABASE_URL must start with "postgresql://"',
      ),

    JWT_SECRET: z
      .string()
      .length(64, 'JWT_SECRET must be exactly 64 hex characters (32 bytes)'),

    // Where the storefront is served from; the only origin CORS will allow.
    WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
    // Where providers can reach this API for webhooks (ngrok URL locally).
    API_PUBLIC_URL: z.string().url().default('http://localhost:3001'),

    REDIS_URL: z.string().startsWith('redis://').optional(),

    STRIPE_SECRET_KEY: z
      .string()
      .regex(
        /^sk_(test|live)_/,
        'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_',
      )
      .optional(),
    STRIPE_WEBHOOK_SECRET: z
      .string()
      .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_')
      .optional(),

    CHAPA_SECRET_KEY: z
      .string()
      .startsWith('CHASECK_', 'CHAPA_SECRET_KEY must start with CHASECK_')
      .optional(),
    CHAPA_WEBHOOK_SECRET: z.string().min(16).optional(),

    // Minutes a reservation is held while the shopper is on the payment page.
    CHECKOUT_HOLD_MINUTES: z.coerce.number().int().min(5).max(120).default(30),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

    // Chapa is the active payment provider; Redis backs the checkout holds.
    const required = [
      'REDIS_URL',
      'CHAPA_SECRET_KEY',
      'CHAPA_WEBHOOK_SECRET',
    ] as const;

    for (const key of required) {
      if (!env[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required in production`,
        });
      }
    }

    // Stripe stays optional. But a half-configured Stripe is worse than none:
    // a key without its webhook secret silently drops payment confirmations.
    if (env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['STRIPE_WEBHOOK_SECRET'],
        message: 'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set',
      });
    }

    if (env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      ctx.addIssue({
        code: 'custom',
        path: ['STRIPE_SECRET_KEY'],
        message: 'A Stripe TEST key cannot be used in production',
      });
    }

    // A TEST key cannot accept real payments, but crashing the whole API over
    // it would take the storefront down too. Fail loud, not fatal — swap in
    // the live key (CHASECK_LIVE-…) as soon as business verification clears.
    if (env.CHAPA_SECRET_KEY?.includes('_TEST-')) {
      console.error(
        '⚠️  CHAPA_SECRET_KEY is a TEST key — hosted checkout will only work with Chapa sandbox test credentials, not real money.',
      );
    }
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
