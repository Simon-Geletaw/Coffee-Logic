import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { PrismaService } from 'src/prisma/prisma.service';

type CheckoutOrder = {
  id: string;
  totalCents: number;
  currency: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

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

  constructor(private readonly prisma: PrismaService) {}

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

    const txRef = `order-${order.id.slice(0, 8)}-${Date.now()}`;
    const [firstName, ...rest] = (order.contactName ?? 'Customer').split(' ');

    const payload = {
      amount: (order.totalCents / 100).toFixed(2),
      currency: order.currency === 'USD' ? 'USD' : 'ETB',
      email: order.contactEmail ?? 'orders@coffee-logic.et',
      first_name: firstName || 'Customer',
      last_name: rest.join(' ') || 'Coffee',
      phone_number: order.contactPhone || undefined,
      tx_ref: txRef,
      // Chapa sends the shopper back here after paying.
      return_url: `${this.webOrigin}/checkout/return?tx_ref=${txRef}`,
      // Chapa posts the (signed) result here — the source of truth.
      callback_url: `${this.apiPublicUrl}/payments/chapa/webhook`,
      customization: {
        title: 'Coffee Logic',
        description: `Order ${order.id.slice(0, 8)}`,
      },
    };

    let checkoutUrl: string | undefined;
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
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

      checkoutUrl = body.data?.checkout_url ?? body.data?.url ?? body.data?.link;
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

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentIntentId: txRef },
    });

    return { checkoutUrl, txRef };
  }

  /**
   * Ask Chapa for the transaction's live status and, when successful, mark the
   * order paid and commit its stock. Safe to call repeatedly.
   */
  async verify(txRef: string): Promise<{
    orderId: string | null;
    status: 'paid' | 'pending' | 'failed' | 'unknown';
  }> {
    const order = await this.prisma.order.findFirst({
      where: { paymentIntentId: txRef },
      select: { id: true, status: true },
    });
    if (!order) {
      return { orderId: null, status: 'unknown' };
    }
    if (order.status === 'paid') {
      return { orderId: order.id, status: 'paid' };
    }

    if (!this.secretKey) {
      throw new ServiceUnavailableException(
        'Payment provider is not configured',
      );
    }

    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(txRef)}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );
    const body = (await response.json()) as {
      status?: string;
      data?: { status?: string };
    };

    const paymentStatus = body.data?.status ?? body.status;
    if (paymentStatus === 'success') {
      await this.markPaid(order.id);
      return { orderId: order.id, status: 'paid' };
    }
    if (paymentStatus === 'failed') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'failed' },
      });
      return { orderId: order.id, status: 'failed' };
    }
    return { orderId: order.id, status: 'pending' };
  }

  /** Apply a webhook event: log it, and mark the order paid when successful. */
  async handleWebhook(event: {
    id?: string;
    tx_ref?: string;
    status?: string;
    [key: string]: unknown;
  }): Promise<{ handled: boolean }> {
    const eventId = event.id ?? `${event.tx_ref ?? 'unknown'}-${Date.now()}`;
    const succeeded = event.status === 'success';

    let handled = false;
    if (event.tx_ref && succeeded) {
      const order = await this.prisma.order.findFirst({
        where: { paymentIntentId: event.tx_ref },
        select: { id: true, status: true },
      });
      if (order && order.status !== 'paid') {
        await this.markPaid(order.id);
      }
      handled = true;
    }

    await this.prisma.webhookLog.create({
      data: {
        provider: 'chapa',
        eventId,
        eventType: 'charge',
        payload: event as object,
        status: succeeded ? 'success' : 'fail',
        processedAt: handled ? new Date() : null,
      },
    });

    return { handled };
  }

  /**
   * Webhook authentication. Chapa signs the raw request body with
   * HMAC-SHA256 (hex) using the webhook secret. When no secret is configured
   * we accept the event but log a warning — production boot refuses to start
   * without one (see env.config.ts).
   */
  verifyWebhookSignature(rawBody: Buffer | string, signature?: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn(
        'CHAPA_WEBHOOK_SECRET is not set — accepting webhook without signature verification',
      );
      return true;
    }
    if (!signature) {
      return false;
    }
    const expected = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return expected === signature;
  }

  /**
   * Flip the order to paid and permanently take its units out of stock
   * (checkout only asserted availability; nothing was reserved).
   */
  private async markPaid(orderId: string): Promise<void> {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'paid', paideAt: new Date() },
      select: {
        id: true,
        items: { select: { productVariantId: true, quantity: true } },
      },
    });

    for (const item of order.items) {
      let remaining = item.quantity;
      // Units live on batches, not variants — drain the freshest batches first.
      const inventories = await this.prisma.inventory.findMany({
        where: {
          status: true,
          available: { gt: 0 },
          batch: {
            isActive: true,
            product: { variants: { some: { id: item.productVariantId } } },
          },
        },
        orderBy: { batch: { roastDate: 'desc' } },
        select: { id: true, onHand: true, available: true },
      });

      for (const inv of inventories) {
        if (remaining <= 0) break;
        const take = Math.min(inv.available, remaining);
        await this.prisma.inventory.update({
          where: { id: inv.id },
          data: { available: inv.available - take, onHand: inv.onHand - take },
        });
        remaining -= take;
      }

      if (remaining > 0) {
        this.logger.warn(
          `Order ${orderId} paid but ${remaining} unit(s) of variant ${item.productVariantId} could not be committed`,
        );
      }
    }
  }
}