import type { Currency } from '@prisma/client';

export type PaymentProviderName = 'stripe' | 'chapa';

export type CreateSessionInput = {
  orderId: string;
  currency: Currency;
  /** Grand total the shopper is charged, minor units (includes shipping). */
  amountCents: number;
  shippingCents: number;
  lines: Array<{ name: string; quantity: number; unitPriceCents: number }>;
  customer: { name: string; email: string; phone?: string };
  /** When our stock hold lapses; the provider session must not outlive it. */
  expiresAt: Date;
  /**
   * Caller-supplied key so a retried request creates the same provider
   * session instead of a second one (SRS FR-CO-007).
   */
  idempotencyKey: string;
  urls: { success: string; cancel: string; webhook: string };
};

export type CreateSessionResult = {
  /** Stripe Checkout Session id or Chapa tx_ref. Stored as Order.paymentIntentId. */
  providerRef: string;
  /** Where to send the shopper. */
  redirectUrl: string;
};

/**
 * What a verified webhook means for us. Providers send many event types;
 * everything we don't act on collapses to `ignored` so the controller stays
 * provider-agnostic.
 */
export type WebhookEvent = {
  /** Provider's unique event id — the key for duplicate detection. */
  eventId: string;
  type: 'paid' | 'failed' | 'ignored';
  providerRef: string;
  /** Our order id when the provider echoes it back (Stripe metadata). */
  orderId?: string;
  /** Settled amount, for tamper detection against Order.totalCents. */
  amountCents?: number;
  currency?: string;
  /** Human-readable cause for `failed`. */
  reason?: string;
  raw: unknown;
};

export type ProviderPaymentStatus = {
  status: 'paid' | 'failed' | 'pending';
  amountCents?: number;
  currency?: string;
};

/**
 * One contract, several drivers. The checkout service never imports a
 * provider directly — it asks the registry for whichever supports the cart's
 * currency, which is what lets tests swap in the fake.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  supports(currency: Currency): boolean;
  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;
  /**
   * Authenticate and decode a webhook. MUST be given the raw request bytes:
   * both providers sign the body as sent, and JSON re-serialisation would
   * change it. Throws when the signature is missing or invalid.
   */
  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookEvent>;
  /** Ask the provider directly — used by the return page and to reconcile. */
  fetchStatus(providerRef: string): Promise<ProviderPaymentStatus>;
}

export const PAYMENT_PROVIDERS = Symbol('PAYMENT_PROVIDERS');

export function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
