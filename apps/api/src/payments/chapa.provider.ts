import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Currency } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  headerValue,
  type CreateSessionInput,
  type CreateSessionResult,
  type PaymentProvider,
  type ProviderPaymentStatus,
  type WebhookEvent,
} from './payment-provider.interface';

const CHAPA_API = 'https://api.chapa.co/v1';

type ChapaInitializeResponse = {
  status: 'success' | 'failed';
  message?: string;
  data?: { checkout_url?: string };
};

type ChapaVerifyResponse = {
  status: 'success' | 'failed';
  message?: string;
  data?: {
    status?: string; // 'success' | 'failed' | 'pending'
    amount?: string | number;
    currency?: string;
    tx_ref?: string;
  };
};

type ChapaWebhookPayload = {
  event?: string; // e.g. 'charge.success'
  status?: string; // 'success' | 'failed' | ...
  tx_ref?: string;
  amount?: string | number;
  currency?: string;
};

/**
 * Chapa (Ethiopian gateway: Telebirr, CBE Birr, local cards) via its hosted
 * checkout. Plain REST with fetch — Chapa ships no Node SDK worth depending on.
 *
 * Webhook authentication: Chapa sends an HMAC-SHA256 of the raw body, keyed
 * with the webhook secret you set in the dashboard, in `x-chapa-signature`
 * (a `Chapa-Signature` variant also exists). We verify with a constant-time
 * compare, then ALSO call the verify endpoint before trusting a "paid" — the
 * webhook is a notification, the API is the truth.
 */
@Injectable()
export class ChapaProvider implements PaymentProvider {
  readonly name = 'chapa' as const;
  private readonly logger = new Logger(ChapaProvider.name);

  constructor(private readonly config: ConfigService) {}

  supports(currency: Currency): boolean {
    return currency === 'ETB';
  }

  private secretKey(): string {
    const key = this.config.get<string>('CHAPA_SECRET_KEY');
    if (!key) {
      throw new ServiceUnavailableException('Chapa is not configured');
    }
    return key;
  }

  /** Chapa wants major units as a string: 65000 santim → "650.00". */
  static toMajorUnits(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  /** "650.00" or 650 → 65000. Rounds to dodge float noise. */
  static toMinorUnits(amount: string | number | undefined): number | undefined {
    if (amount === undefined || amount === null || amount === '')
      return undefined;
    const parsed =
      typeof amount === 'number' ? amount : Number.parseFloat(amount);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
  }

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    // tx_ref must be unique per attempt; a retry after `failed` needs a new
    // one, so it is derived from the idempotency key, not the order id alone.
    const txRef = `mlk-${input.orderId.slice(0, 8)}-${input.idempotencyKey.slice(0, 12)}`;
    const [firstName, ...rest] = input.customer.name.trim().split(/\s+/);

    const response = await fetch(`${CHAPA_API}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: ChapaProvider.toMajorUnits(input.amountCents),
        currency: input.currency,
        email: input.customer.email,
        first_name: firstName,
        last_name: rest.join(' ') || firstName,
        phone_number: input.customer.phone,
        tx_ref: txRef,
        callback_url: input.urls.webhook,
        return_url: input.urls.success,
        customization: {
          title: 'Melkora Coffee',
          description: `Order ${input.orderId.slice(0, 8).toUpperCase()}`,
        },
      }),
    });

    const body = (await response
      .json()
      .catch(() => null)) as ChapaInitializeResponse | null;

    if (
      !response.ok ||
      body?.status !== 'success' ||
      !body.data?.checkout_url
    ) {
      this.logger.error(
        `Chapa initialize failed: ${response.status} ${body?.message ?? ''}`,
      );
      throw new ServiceUnavailableException(
        body?.message ?? 'Chapa could not start the payment',
      );
    }

    return { providerRef: txRef, redirectUrl: body.data.checkout_url };
  }

  // The provider contract is async (Chapa's verify and future JWKS-style
  // schemes need I/O); this implementation happens to be synchronous.
  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookEvent> {
    const secret = this.config.get<string>('CHAPA_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException(
        'Chapa webhook secret is not configured',
      );
    }

    const signature =
      headerValue(headers, 'x-chapa-signature') ??
      headerValue(headers, 'chapa-signature');
    if (!signature) {
      throw new BadRequestException('Missing Chapa signature header');
    }

    if (!ChapaProvider.signatureMatches(rawBody, secret, signature)) {
      this.logger.warn('Rejected Chapa webhook: signature mismatch');
      throw new BadRequestException('Invalid Chapa signature');
    }

    let payload: ChapaWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as ChapaWebhookPayload;
    } catch {
      throw new BadRequestException('Chapa webhook body is not valid JSON');
    }

    return ChapaProvider.toWebhookEvent(payload);
  }

  /** Constant-time HMAC check. Exposed for tests. */
  static signatureMatches(
    rawBody: Buffer,
    secret: string,
    signature: string,
  ): boolean {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature.trim().toLowerCase(), 'utf8');
    // timingSafeEqual throws on length mismatch; unequal length is simply false.
    return a.length === b.length && timingSafeEqual(a, b);
  }

  static toWebhookEvent(payload: ChapaWebhookPayload): WebhookEvent {
    const txRef = payload.tx_ref ?? '';
    const status = (payload.status ?? '').toLowerCase();
    const event = (payload.event ?? '').toLowerCase();

    // Chapa has no event id; the tuple is stable per outcome, so a redelivery
    // of the same outcome de-duplicates while a later, different outcome
    // (rare) still gets through.
    const eventId = `chapa:${txRef}:${event || status}`;

    const paid = status === 'success' || event === 'charge.success';
    const failed =
      status === 'failed' ||
      status === 'cancelled' ||
      event.endsWith('.failed');

    return {
      eventId,
      type: paid ? 'paid' : failed ? 'failed' : 'ignored',
      providerRef: txRef,
      amountCents: ChapaProvider.toMinorUnits(payload.amount),
      currency: payload.currency?.toUpperCase(),
      reason: failed ? 'The payment was not completed.' : undefined,
      raw: payload,
    };
  }

  async fetchStatus(providerRef: string): Promise<ProviderPaymentStatus> {
    const response = await fetch(
      `${CHAPA_API}/transaction/verify/${encodeURIComponent(providerRef)}`,
      { headers: { Authorization: `Bearer ${this.secretKey()}` } },
    );
    const body = (await response
      .json()
      .catch(() => null)) as ChapaVerifyResponse | null;

    if (!response.ok || !body) {
      this.logger.error(`Chapa verify failed: ${response.status}`);
      throw new ServiceUnavailableException(
        'Chapa could not verify the payment',
      );
    }

    const status = (body.data?.status ?? body.status).toLowerCase();
    if (status === 'success') {
      return {
        status: 'paid',
        amountCents: ChapaProvider.toMinorUnits(body.data?.amount),
        currency: body.data?.currency?.toUpperCase(),
      };
    }
    if (status === 'failed' || status === 'cancelled') {
      return { status: 'failed' };
    }
    return { status: 'pending' };
  }
}
