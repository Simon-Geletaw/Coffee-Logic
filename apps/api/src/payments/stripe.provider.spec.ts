import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeProvider } from './stripe.provider';

/**
 * No network: Stripe's SDK can both *sign* (generateTestHeaderString) and
 * *verify* (constructEvent) locally, so signature handling is tested for real.
 */
const WEBHOOK_SECRET = 'whsec_test_secret_for_unit_tests_only';

function makeConfig(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function sessionEvent(
  type: string,
  session: Partial<Stripe.Checkout.Session>,
  id = `evt_${Math.random().toString(36).slice(2)}`,
) {
  return {
    id,
    object: 'event',
    type,
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        object: 'checkout.session',
        id: 'cs_test_123',
        payment_status: 'paid',
        status: 'complete',
        amount_total: 5000,
        currency: 'usd',
        metadata: { orderId: 'order-1' },
        client_reference_id: 'order-1',
        ...session,
      },
    },
  } as unknown as Stripe.Event;
}

function sign(payload: string, secret = WEBHOOK_SECRET): string {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret });
}

describe('StripeProvider', () => {
  let provider: StripeProvider;

  beforeEach(() => {
    provider = new StripeProvider(
      makeConfig({
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
      }),
    );
  });

  describe('supports', () => {
    it('handles USD only — ETB goes to Chapa', () => {
      expect(provider.supports('USD')).toBe(true);
      expect(provider.supports('ETB')).toBe(false);
    });
  });

  describe('verifyWebhook', () => {
    it('accepts a correctly signed event and maps completed+paid to `paid`', async () => {
      const event = sessionEvent('checkout.session.completed', {}, 'evt_1');
      const payload = JSON.stringify(event);

      const result = await provider.verifyWebhook(Buffer.from(payload), {
        'stripe-signature': sign(payload),
      });

      expect(result).toMatchObject({
        eventId: 'evt_1',
        type: 'paid',
        providerRef: 'cs_test_123',
        orderId: 'order-1',
        amountCents: 5000,
        currency: 'USD',
      });
    });

    it('rejects a payload signed with a different secret', async () => {
      const payload = JSON.stringify(
        sessionEvent('checkout.session.completed', {}),
      );
      await expect(
        provider.verifyWebhook(Buffer.from(payload), {
          'stripe-signature': sign(payload, 'whsec_wrong'),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a body that was altered after signing', async () => {
      const payload = JSON.stringify(
        sessionEvent('checkout.session.completed', {}),
      );
      const signature = sign(payload);
      const tampered = payload.replace(
        '"amount_total":5000',
        '"amount_total":1',
      );

      await expect(
        provider.verifyWebhook(Buffer.from(tampered), {
          'stripe-signature': signature,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the signature header is missing', async () => {
      const payload = JSON.stringify(
        sessionEvent('checkout.session.completed', {}),
      );
      await expect(
        provider.verifyWebhook(Buffer.from(payload), {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('fails closed when the webhook secret is not configured', async () => {
      const unconfigured = new StripeProvider(
        makeConfig({ STRIPE_SECRET_KEY: 'sk_test_x' }),
      );
      const payload = JSON.stringify(
        sessionEvent('checkout.session.completed', {}),
      );
      await expect(
        unconfigured.verifyWebhook(Buffer.from(payload), {
          'stripe-signature': sign(payload),
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('toWebhookEvent (mapping)', () => {
    it('treats completed with payment_status=unpaid as ignored — money has not moved yet', () => {
      const event = sessionEvent('checkout.session.completed', {
        payment_status: 'unpaid',
      });
      expect(provider.toWebhookEvent(event).type).toBe('ignored');
    });

    it('maps async_payment_succeeded to paid', () => {
      const event = sessionEvent(
        'checkout.session.async_payment_succeeded',
        {},
      );
      expect(provider.toWebhookEvent(event).type).toBe('paid');
    });

    it('maps expired to failed with a shopper-readable reason', () => {
      const event = sessionEvent('checkout.session.expired', {
        payment_status: 'unpaid',
      });
      const mapped = provider.toWebhookEvent(event);
      expect(mapped.type).toBe('failed');
      expect(mapped.reason).toMatch(/expired/i);
    });

    it('maps async_payment_failed to failed', () => {
      const event = sessionEvent('checkout.session.async_payment_failed', {
        payment_status: 'unpaid',
      });
      expect(provider.toWebhookEvent(event).type).toBe('failed');
    });

    it('falls back to client_reference_id when metadata is missing', () => {
      const event = sessionEvent('checkout.session.completed', {
        metadata: {},
        client_reference_id: 'order-fallback',
      });
      expect(provider.toWebhookEvent(event).orderId).toBe('order-fallback');
    });

    it('ignores unrelated event types', () => {
      const event = sessionEvent('payment_intent.created', {});
      expect(provider.toWebhookEvent(event).type).toBe('ignored');
    });
  });

  describe('createSession', () => {
    it('fails closed when the secret key is not configured', async () => {
      const unconfigured = new StripeProvider(makeConfig({}));
      await expect(
        unconfigured.createSession({
          orderId: 'o',
          currency: 'USD',
          amountCents: 100,
          shippingCents: 0,
          lines: [],
          customer: { name: 'A', email: 'a@b.c' },
          expiresAt: new Date(),
          idempotencyKey: 'k',
          urls: { success: 's', cancel: 'c', webhook: 'w' },
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
