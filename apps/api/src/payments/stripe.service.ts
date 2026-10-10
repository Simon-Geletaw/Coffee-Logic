import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CheckoutOrder,
  PaymentResult,
  PaymentSettlementService,
} from './payment-settlement.service';

@Injectable()
export class StripeService {
  private readonly stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        timeout: 15_000,
        maxNetworkRetries: 1,
      })
    : null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settlement: PaymentSettlementService,
  ) {}

  get isConfigured(): boolean {
    return this.stripe !== null;
  }

  async initializeForOrder(
    order: CheckoutOrder,
  ): Promise<{ checkoutUrl: string }> {
    if (!this.stripe)
      throw new ServiceUnavailableException(
        'Stripe is not configured. Please choose another payment method.',
      );
    const origin = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.create(
        {
          mode: 'payment',
          client_reference_id: order.id,
          customer_email: order.contactEmail ?? undefined,
          metadata: { orderId: order.id },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: order.currency.toLowerCase(),
                unit_amount: order.totalCents,
                product_data: {
                  name: `Coffee Logic order ${order.id.slice(0, 8)}`,
                },
              },
            },
          ],
          success_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/orders/${order.id}`,
        },
        {
          idempotencyKey: `checkout-${order.id}-${order.totalCents}-${order.currency}`,
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'Stripe payment could not be started. Please try again.',
      );
    }
    if (!session.url)
      throw new ServiceUnavailableException('Stripe returned no checkout URL.');
    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentIntentId: session.id },
    });
    return { checkoutUrl: session.url };
  }

  async verify(sessionId: string): Promise<PaymentResult> {
    if (!this.stripe)
      throw new ServiceUnavailableException('Stripe is not configured.');
    const order = await this.prisma.order.findFirst({
      where: { paymentProvider: 'stripe', paymentIntentId: sessionId },
    });
    if (!order) return { orderId: null, status: 'unknown' };
    if (order.status === 'paid') return { orderId: order.id, status: 'paid' };
    if (order.status === 'refunded' || order.status === 'cart')
      return { orderId: order.id, status: 'unknown' };
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      throw new ServiceUnavailableException(
        'Could not verify Stripe payment. Please retry.',
      );
    }
    if (
      session.client_reference_id !== order.id ||
      session.amount_total !== order.totalCents ||
      session.currency?.toUpperCase() !== order.currency.toUpperCase()
    ) {
      throw new BadRequestException('Payment details do not match the order.');
    }
    if (session.payment_status === 'paid') {
      await this.settlement.markPaid(order.id);
      return { orderId: order.id, status: 'paid' };
    }
    return {
      orderId: order.id,
      status: session.status === 'expired' ? 'failed' : 'pending',
    };
  }

  async handleWebhook(
    rawBody: Buffer,
    signature?: string,
  ): Promise<{ handled: boolean }> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!this.stripe || !secret || !signature)
      throw new BadRequestException('Invalid webhook signature');
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }
    if (
      event.type !== 'checkout.session.completed' &&
      event.type !== 'checkout.session.async_payment_succeeded'
    )
      return { handled: false };
    const result = await this.verify(event.data.object.id);
    return { handled: result.status === 'paid' };
  }
}
