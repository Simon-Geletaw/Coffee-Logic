import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Currency } from '@prisma/client';
import Stripe from 'stripe';
import {
  headerValue,
  type CreateSessionInput,
  type CreateSessionResult,
  type PaymentProvider,
  type ProviderPaymentStatus,
  type WebhookEvent,
} from './payment-provider.interface';

/**
 * Stripe via hosted Checkout Sessions.
 *
 * Why hosted Checkout and not Elements: PCI scope stays with Stripe, Apple /
 * Google Pay come for free (SRS FR-CO-005), and the session has a built-in
 * expiry that mirrors our stock hold.
 */
@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  private readonly logger = new Logger(StripeProvider.name);
  private client: Stripe | null = null;

  constructor(private readonly config: ConfigService) {}

  supports(currency: Currency): boolean {
    return currency === 'USD';
  }

  private stripe(): Stripe {
    if (this.client) return this.client;
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      throw new ServiceUnavailableException('Stripe is not configured');
    }
    this.client = new Stripe(key);
    return this.client;
  }

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const currency = input.currency.toLowerCase();

    const session = await this.stripe().checkout.sessions.create(
      {
        mode: 'payment',
        // Our order id travels with the session so the webhook can find the
        // order without a lookup table. Both fields, belt and braces.
        client_reference_id: input.orderId,
        metadata: { orderId: input.orderId },
        customer_email: input.customer.email,
        line_items: input.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency,
            unit_amount: line.unitPriceCents,
            product_data: { name: line.name },
          },
        })),
        shipping_options:
          input.shippingCents > 0
            ? [
                {
                  shipping_rate_data: {
                    type: 'fixed_amount',
                    display_name: 'Shipping',
                    fixed_amount: { amount: input.shippingCents, currency },
                  },
                },
              ]
            : undefined,
        // Stripe requires >= 30 min; env validation enforces our hold >= 30.
        expires_at: Math.floor(input.expiresAt.getTime() / 1000),
        success_url: input.urls.success,
        cancel_url: input.urls.cancel,
      },
      // Stripe de-duplicates on this key for 24 h: a retried checkout request
      // gets the original session back instead of creating a second one.
      { idempotencyKey: input.idempotencyKey },
    );

    if (!session.url) {
      throw new ServiceUnavailableException(
        'Stripe did not return a checkout URL',
      );
    }

    return { providerRef: session.id, redirectUrl: session.url };
  }

  // The provider contract is async (Chapa's verify and future JWKS-style
  // schemes need I/O); this implementation happens to be synchronous.
  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookEvent> {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException(
        'Stripe webhook secret is not configured',
      );
    }

    const signature = headerValue(headers, 'stripe-signature');
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;
    try {
      // Verifies the HMAC over the raw bytes and rejects timestamps older
      // than 5 minutes (replay protection). Any failure throws.
      event = this.stripe().webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      this.logger.warn(`Rejected Stripe webhook: ${(error as Error).message}`);
      throw new BadRequestException('Invalid Stripe signature');
    }

    return this.toWebhookEvent(event);
  }

  /** Exposed for tests: mapping logic without the signature dance. */
  toWebhookEvent(event: Stripe.Event): WebhookEvent {
    const base = { eventId: event.id, raw: event };

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        return {
          ...base,
          // `completed` fires for delayed methods before money moves; only
          // payment_status === 'paid' is proof.
          type: session.payment_status === 'paid' ? 'paid' : 'ignored',
          providerRef: session.id,
          orderId:
            session.metadata?.orderId ??
            session.client_reference_id ??
            undefined,
          amountCents: session.amount_total ?? undefined,
          currency: session.currency?.toUpperCase(),
        };
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        return {
          ...base,
          type: 'failed',
          providerRef: session.id,
          orderId:
            session.metadata?.orderId ??
            session.client_reference_id ??
            undefined,
          reason:
            event.type === 'checkout.session.expired'
              ? 'The payment page expired before payment was completed.'
              : 'The payment could not be completed.',
        };
      }
      default:
        return { ...base, type: 'ignored', providerRef: '' };
    }
  }

  async fetchStatus(providerRef: string): Promise<ProviderPaymentStatus> {
    const session = await this.stripe().checkout.sessions.retrieve(providerRef);

    if (session.payment_status === 'paid') {
      return {
        status: 'paid',
        amountCents: session.amount_total ?? undefined,
        currency: session.currency?.toUpperCase(),
      };
    }
    if (session.status === 'expired') {
      return { status: 'failed' };
    }
    return { status: 'pending' };
  }
}
