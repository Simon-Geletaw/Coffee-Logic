import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

import {
  CheckoutOrder,
  PaymentResult,
  PaymentSettlementService,
} from './payment-settlement.service';

/**
 * Chapa payment provider (https://developer.chapa.co).
 *
 * Flow: checkout mints a tx_ref and calls Chapa's initialize endpoint, which
 * returns a hosted checkout URL the browser is redirected to. Chapa then
 * notifies us twice — a webhook (source of truth) and the shopper landing on
 * our return URL, which we answer by verifying the transaction directly.
 */
@Injectable()
export class ChapaService {
  private readonly logger = new Logger(ChapaService.name);
  private readonly secretKey = process.env.CHAPA_SECRET_KEY;
  private readonly webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
  private readonly baseUrl = 'https://api.chapa.co/v1';
  private readonly webOrigin =
    process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  private readonly apiPublicUrl =
    process.env.API_PUBLIC_URL ?? 'http://localhost:3001';

  constructor(
    private readonly prisma: PrismaService,
    private readonly settlement: PaymentSettlementService,
  ) {}

  get isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  /**
   * Start a Chapa transaction for a placed order and remember its tx_ref.
   * Resolves with the hosted checkout URL to redirect the shopper to.
   */
  async initializeForOrder(order: CheckoutOrder): Promise<{
    checkoutUrl: string;
    txRef: string;
  }> {
    if (!this.secretKey) {
      throw new ServiceUnavailableException(
        'Payment provider is not configured (CHAPA_SECRET_KEY missing)',
      );
    }

    const txRef = `order-${randomUUID()}`;
    const [firstName, ...rest] = (order.contactName ?? 'Customer').split(' ');

    const payload = {
      amount: (order.totalCents / 100).toFixed(2),
      currency: order.currency,
      email: order.contactEmail ?? 'orders@coffee-logic.et',
      first_name: firstName || 'Customer',
      last_name: rest.join(' ') || 'Coffee',
      phone_number: order.contactPhone || undefined,
      tx_ref: txRef,
      // Chapa sends the shopper back here after paying.
      return_url: `${this.webOrigin}/checkout/return?tx_ref=${txRef}`,
      // Chapa posts the (signed) result here — the source of truth.
      callback_url: `${this.apiPublicUrl.replace(/\/$/, '')}/payments/chapa/callback`,
      customization: {
        title: 'Coffee Logic',
        description: `Order ${order.id.slice(0, 8)}`,
      },
    };

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentIntentId: txRef },
    });
    let checkoutUrl: string | undefined;
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        status?: string;
        message?: string;
        data?: { checkout_url?: string; url?: string; link?: string };
      };

      if (!response.ok || body.status !== 'success') {
        throw new Error(body.message ?? `Chapa responded ${response.status}`);
      }

      checkoutUrl =
        body.data?.checkout_url ?? body.data?.url ?? body.data?.link;
    } catch (error) {
      this.logger.error(
        `Chapa initialize failed for order ${order.id}: ${String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Payment could not be started. Please try again.',
      );
    }

    if (!checkoutUrl) {
      this.logger.error(
        `Chapa initialize for order ${order.id} returned no checkout URL`,
      );
      throw new ServiceUnavailableException(
        'Payment could not be started. Please try again.',
      );
    }

    return { checkoutUrl, txRef };
  }

  /**
   * Ask Chapa for the transaction's live status and, when successful, mark the
   * order paid and commit its stock. Safe to call repeatedly.
   */
  async verify(txRef: string): Promise<PaymentResult> {
    const order = await this.prisma.order.findFirst({
      where: { paymentIntentId: txRef, paymentProvider: 'chapa' },
    });
    if (!order) return { orderId: null, status: 'unknown' };
    if (order.status === 'paid') return { orderId: order.id, status: 'paid' };
    if (order.status === 'refunded' || order.status === 'cart')
      return { orderId: order.id, status: 'unknown' };
    if (!this.secretKey)
      throw new ServiceUnavailableException('Chapa is not configured.');

    let body: {
      status?: string;
      data?: {
        status?: string;
        tx_ref?: string;
        amount?: string | number;
        currency?: string;
        mode?: string;
      };
    };
    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${encodeURIComponent(txRef)}`,
        {
          headers: { Authorization: `Bearer ${this.secretKey}` },
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok) throw new Error('Chapa verification failed');
      body = (await response.json()) as typeof body;
    } catch {
      throw new ServiceUnavailableException(
        'Could not verify Chapa payment. Please retry.',
      );
    }
    const data = body.data;
    // The envelope's "success" only means the lookup worked, not that money moved.
    if (body.status === 'success' && data?.status === 'success') {
      const expectedMode = this.secretKey.includes('_TEST-') ? 'test' : 'live';
      if (
        data.tx_ref !== txRef ||
        Math.round(Number(data.amount) * 100) !== order.totalCents ||
        data.currency !== order.currency ||
        data.mode !== expectedMode
      ) {
        throw new BadRequestException(
          'Payment details do not match the order.',
        );
      }
      await this.settlement.markPaid(order.id);
      return { orderId: order.id, status: 'paid' };
    }
    if (
      body.status === 'success' &&
      ['failed', 'cancelled', 'failed/cancelled'].includes(data?.status ?? '')
    ) {
      await this.prisma.order.updateMany({
        where: { id: order.id, status: 'pending' },
        data: { status: 'failed' },
      });
      return { orderId: order.id, status: 'failed' };
    }
    return { orderId: order.id, status: 'pending' };
  }

  async handleWebhook(event: {
    tx_ref?: string;
    status?: string;
    [key: string]: unknown;
  }): Promise<{ handled: boolean }> {
    if (typeof event.tx_ref !== 'string' || !event.tx_ref)
      return { handled: false };
    const result = await this.verify(event.tx_ref);
    return { handled: result.status === 'paid' || result.status === 'failed' };
  }

  verifyWebhookSignature(
    rawBody: Buffer | string,
    signature?: string,
    legacySignature?: string,
  ): boolean {
    if (!this.webhookSecret) return false;
    const matches = (value: string | undefined, payload: Buffer | string) => {
      if (!value || !/^[a-f0-9]{64}$/i.test(value)) return false;
      const expected = createHmac('sha256', this.webhookSecret!)
        .update(payload)
        .digest();
      return timingSafeEqual(expected, Buffer.from(value, 'hex'));
    };
    return (
      matches(signature, rawBody) ||
      matches(legacySignature, this.webhookSecret)
    );
  }
}
