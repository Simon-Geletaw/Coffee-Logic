import { BadRequestException, Injectable } from '@nestjs/common';
import {
  headerValue,
  type CreateSessionInput,
  type CreateSessionResult,
  type PaymentProvider,
  type ProviderPaymentStatus,
  type WebhookEvent,
} from './payment-provider.interface';

/**
 * In-process stand-in for Stripe and Chapa.
 *
 * Enabled only when PAYMENTS_FAKE=true (env validation forbids it in
 * production). It supports every currency, "redirects" straight back to the
 * return page, and settles when something POSTs a JSON webhook to
 * /payments/fake/webhook with the header `x-fake-signature: fake`.
 *
 * Playwright drives the whole shop → paid flow through this without network.
 */
@Injectable()
export class FakePaymentProvider implements PaymentProvider {
  // The registry reports this name to the frontend as whichever real provider
  // the currency maps to; internally it is just "fake".
  readonly name = 'stripe' as const;

  private readonly sessions = new Map<string, ProviderPaymentStatus>();

  supports(): boolean {
    return true;
  }

  // The provider contract is async (Chapa's verify and future JWKS-style
  // schemes need I/O); this implementation happens to be synchronous.
  // eslint-disable-next-line @typescript-eslint/require-await
  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const providerRef = `fake_${input.orderId}`;
    this.sessions.set(providerRef, {
      status: 'pending',
      amountCents: input.amountCents,
      currency: input.currency,
    });
    return {
      providerRef,
      redirectUrl: `${input.urls.success}${input.urls.success.includes('?') ? '&' : '?'}fake=1`,
    };
  }

  // The provider contract is async (Chapa's verify and future JWKS-style
  // schemes need I/O); this implementation happens to be synchronous.
  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookEvent> {
    if (headerValue(headers, 'x-fake-signature') !== 'fake') {
      throw new BadRequestException('Invalid fake signature');
    }

    const body = JSON.parse(rawBody.toString('utf8')) as {
      providerRef: string;
      type: 'paid' | 'failed';
      eventId?: string;
      amountCents?: number;
      currency?: string;
    };

    const known = this.sessions.get(body.providerRef);
    const settled: ProviderPaymentStatus = {
      status: body.type,
      amountCents: body.amountCents ?? known?.amountCents,
      currency: body.currency ?? known?.currency,
    };
    this.sessions.set(body.providerRef, settled);

    return {
      eventId: body.eventId ?? `fake:${body.providerRef}:${body.type}`,
      type: body.type,
      providerRef: body.providerRef,
      orderId: body.providerRef.replace(/^fake_/, ''),
      amountCents: settled.amountCents,
      currency: settled.currency,
      reason: body.type === 'failed' ? 'Fake payment declined.' : undefined,
      raw: body,
    };
  }

  // The provider contract is async (Chapa's verify and future JWKS-style
  // schemes need I/O); this implementation happens to be synchronous.
  // eslint-disable-next-line @typescript-eslint/require-await
  async fetchStatus(providerRef: string): Promise<ProviderPaymentStatus> {
    return this.sessions.get(providerRef) ?? { status: 'pending' };
  }

  /** Test helper. */
  settle(providerRef: string, status: 'paid' | 'failed'): void {
    const known = this.sessions.get(providerRef);
    this.sessions.set(providerRef, { ...known, status });
  }
}
