import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import type Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS } from 'src/redis/redis.constants';
import {
  OrdersService,
  cartInclude,
  type CartRecord,
} from 'src/orders/orders.service';
import { ShippingService } from 'src/shipping/shipping.service';
import { PaymentProviderRegistry } from 'src/payments/payment-provider.registry';
import type {
  PaymentProvider,
  PaymentProviderName,
  WebhookEvent,
} from 'src/payments/payment-provider.interface';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

type Tx = Prisma.TransactionClient;

export type CheckoutSessionResponse = {
  orderId: string;
  provider: PaymentProviderName;
  redirectUrl: string;
  expiresAt: string;
};

export type CheckoutStatusResponse = {
  orderId: string;
  status: string;
  paymentProvider: string | null;
  totalCents: number;
  currency: string;
  paymentExpiresAt: string | null;
  failureReason: string | null;
};

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
const LOCK_TTL_MS = 10_000;
const RECONCILE_THROTTLE_SECONDS = 5;
const SWEEP_BATCH = 50;

/**
 * The order state machine. Owns every transition out of `cart`:
 *
 *   cart|failed ──createSession──► pending ──webhook paid──► paid
 *                                    │
 *                                    └──webhook failed / hold expired──► failed
 *
 * Invariants this class protects:
 *  - Stock is reserved atomically when a session opens and is either
 *    committed (paid) or released (failed) exactly once.
 *  - `paid` is reached only via a signature-verified provider event or a
 *    direct provider status check — never from the browser.
 *  - Every transition is idempotent: replaying a webhook or double-clicking
 *    "Place order" changes nothing the second time.
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private warnedNoRedis = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly shipping: ShippingService,
    private readonly providers: PaymentProviderRegistry,
    private readonly config: ConfigService,
    @Inject(REDIS) private readonly redis: Redis | null,
  ) {}

  /* ─── Redis helpers (no-ops when Redis is not configured) ────────── */

  private redisOrNull(): Redis | null {
    if (!this.redis && !this.warnedNoRedis) {
      this.warnedNoRedis = true;
      this.logger.warn(
        'REDIS_URL not set: checkout idempotency and locking are disabled (dev only).',
      );
    }
    return this.redis;
  }

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const redis = this.redisOrNull();
    if (!redis) return fn();

    let acquired: string | null;
    try {
      acquired = await redis.set(key, '1', 'PX', LOCK_TTL_MS, 'NX');
    } catch (error) {
      // Without the lock two requests could double-reserve: fail closed.
      this.logger.error(`Redis lock unavailable: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'Checkout is temporarily unavailable. Please try again in a moment.',
      );
    }
    if (acquired !== 'OK') {
      throw new ConflictException(
        'Another checkout is already in progress for this cart.',
      );
    }
    try {
      return await fn();
    } finally {
      await redis.del(key).catch(() => undefined);
    }
  }

  private async recallIdempotent(
    key: string,
  ): Promise<CheckoutSessionResponse | null> {
    const redis = this.redisOrNull();
    if (!redis) return null;
    try {
      const cached = await redis.get(`idem:checkout:${key}`);
      return cached ? (JSON.parse(cached) as CheckoutSessionResponse) : null;
    } catch (error) {
      this.logger.warn(`Idempotency read failed: ${(error as Error).message}`);
      return null;
    }
  }

  private async rememberIdempotent(
    key: string,
    value: CheckoutSessionResponse,
  ): Promise<void> {
    const redis = this.redisOrNull();
    if (!redis) return;
    try {
      await this.writeIdempotent(redis, key, value);
    } catch (error) {
      this.logger.warn(`Idempotency write failed: ${(error as Error).message}`);
    }
  }

  private async writeIdempotent(
    redis: Redis,
    key: string,
    value: CheckoutSessionResponse,
  ): Promise<void> {
    await redis.set(
      `idem:checkout:${key}`,
      JSON.stringify(value),
      'EX',
      IDEMPOTENCY_TTL_SECONDS,
    );
    // The same redirect is also kept per order so a shopper who closes the
    // provider tab can resume from /cart without opening a second session.
    const ttl = Math.max(
      60,
      Math.floor((Date.parse(value.expiresAt) - Date.now()) / 1000),
    );
    await redis.set(
      `checkout:redirect:${value.orderId}`,
      JSON.stringify(value),
      'EX',
      ttl,
    );
  }

  private async recallRedirect(
    orderId: string,
  ): Promise<CheckoutSessionResponse | null> {
    const redis = this.redisOrNull();
    if (!redis) return null;
    try {
      const cached = await redis.get(`checkout:redirect:${orderId}`);
      return cached ? (JSON.parse(cached) as CheckoutSessionResponse) : null;
    } catch (error) {
      this.logger.warn(`Redirect read failed: ${(error as Error).message}`);
      return null;
    }
  }

  /* ─── Session creation ───────────────────────────────────────────── */

  private holdMinutes(): number {
    return this.config.get<number>('CHECKOUT_HOLD_MINUTES') ?? 30;
  }

  private urls(orderId: string, provider: PaymentProviderName) {
    const web =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    const api =
      this.config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:3001';
    return {
      success: `${web}/checkout/return?order=${orderId}`,
      cancel: `${web}/cart`,
      webhook: `${api}/payments/${provider}/webhook`,
    };
  }

  async createSession(
    cartToken: string | undefined,
    dto: CreateCheckoutSessionDto,
    idempotencyKey: string,
  ): Promise<CheckoutSessionResponse> {
    const replay = await this.recallIdempotent(idempotencyKey);
    if (replay) return replay;

    const cart = await this.orders.requireCart(cartToken);

    if (cart.status === 'pending') {
      const expired =
        !cart.paymentExpiresAt || cart.paymentExpiresAt.getTime() <= Date.now();
      if (!expired) {
        // Same shopper, same open session: hand back the same redirect.
        const existing = await this.recallRedirect(cart.id);
        if (existing) return existing;
        throw new ConflictException(
          'A payment is already in progress for this cart. Check its status or wait for it to expire.',
        );
      }
      // The hold lapsed and the sweeper has not run yet — expire it now so
      // this request becomes a clean retry.
      await this.expireOrder(
        cart.id,
        'The payment page expired before payment was completed.',
      );
    }

    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty.');
    }

    const provider = this.providers.resolve(dto.paymentProvider, cart.currency);

    return this.withLock(`lock:checkout:${cart.id}`, async () => {
      const expiresAt = new Date(Date.now() + this.holdMinutes() * 60_000);

      // Everything that must be all-or-nothing happens inside one transaction:
      // re-pricing, the atomic reservation, and the status flip.
      const priced = await this.prisma.$transaction(async (tx) => {
        const pricedLines = await this.repriceLines(tx, cart);
        const subtotalCents = pricedLines.reduce(
          (sum, line) => sum + line.lineTotalCents,
          0,
        );
        const totalWeightGrams = pricedLines.reduce(
          (sum, line) => sum + line.quantity * line.weightGrams,
          0,
        );
        // Strict here: an unpriceable weight must stop checkout, not ship free.
        const shipping = await this.shipping.quote(
          cart.currency,
          totalWeightGrams,
        );
        const totalCents = subtotalCents + shipping.cents;

        await this.reserveStock(tx, cart.id, pricedLines);

        await tx.order.update({
          where: { id: cart.id },
          data: {
            status: 'pending',
            subtotalCents,
            shippingCents: shipping.cents,
            totalWeightGrams,
            totalCents,
            paymentProvider: dto.paymentProvider,
            paymentIntentId: null,
            paymentExpiresAt: expiresAt,
            failureReason: null,
            contactName: dto.contactName,
            contactEmail: dto.contactEmail,
            contactPhone: dto.contactPhone ?? null,
            shippingAddress: dto.shippingAddress,
          },
        });

        return { pricedLines, shippingCents: shipping.cents, totalCents };
      });

      // Network I/O stays outside the transaction: a slow provider must not
      // hold Postgres row locks, and a failed call is compensated explicitly.
      let session;
      try {
        session = await provider.createSession({
          orderId: cart.id,
          currency: cart.currency,
          amountCents: priced.totalCents,
          shippingCents: priced.shippingCents,
          lines: priced.pricedLines.map((line) => ({
            name: line.name,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
          })),
          customer: {
            name: dto.contactName,
            email: dto.contactEmail,
            phone: dto.contactPhone,
          },
          expiresAt,
          idempotencyKey,
          urls: this.urls(cart.id, dto.paymentProvider),
        });
      } catch (error) {
        this.logger.error(
          `Provider ${dto.paymentProvider} failed for order ${cart.id}: ${(error as Error).message}`,
        );
        // Undo the hold so the shopper can try again immediately.
        await this.prisma.$transaction(async (tx) => {
          await this.releaseReservations(tx, cart.id);
          await tx.order.update({
            where: { id: cart.id },
            data: {
              status: 'cart',
              paymentExpiresAt: null,
              paymentProvider: null,
            },
          });
        });
        if (error instanceof ServiceUnavailableException) throw error;
        throw new ServiceUnavailableException(
          'The payment provider is unavailable right now. Please try again.',
        );
      }

      await this.prisma.order.update({
        where: { id: cart.id },
        data: { paymentIntentId: session.providerRef },
      });

      const response: CheckoutSessionResponse = {
        orderId: cart.id,
        provider: dto.paymentProvider,
        redirectUrl: session.redirectUrl,
        expiresAt: expiresAt.toISOString(),
      };
      await this.rememberIdempotent(idempotencyKey, response);
      return response;
    });
  }

  /**
   * Re-read every line's variant *now*: a cart can sit for days, and both the
   * price and the availability must be current at the moment money moves.
   */
  private async repriceLines(tx: Tx, cart: CartRecord) {
    const priced: Array<{
      itemId: string;
      productId: string;
      name: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      weightGrams: number;
    }> = [];

    for (const item of cart.items) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.productVariantId },
        select: {
          priceCents: true,
          weightGrams: true,
          isActive: true,
          currency: true,
          product: { select: { id: true, name: true, isActive: true } },
        },
      });

      if (!variant || !variant.isActive || !variant.product.isActive) {
        throw new UnprocessableEntityException(
          `${item.productVariant.product.name} is no longer available. Remove it to continue.`,
        );
      }
      if (variant.currency !== cart.currency) {
        throw new UnprocessableEntityException(
          `${variant.product.name} is no longer priced in ${cart.currency}.`,
        );
      }

      const lineTotalCents = variant.priceCents * item.quantity;
      if (
        lineTotalCents !== item.lineTotalCents ||
        variant.priceCents !== item.unitPriceCents
      ) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { unitPriceCents: variant.priceCents, lineTotalCents },
        });
      }

      priced.push({
        itemId: item.id,
        productId: variant.product.id,
        name: `${variant.product.name} · ${variant.weightGrams} g`,
        quantity: item.quantity,
        unitPriceCents: variant.priceCents,
        lineTotalCents,
        weightGrams: variant.weightGrams,
      });
    }

    return priced;
  }

  /* ─── Stock reservation ──────────────────────────────────────────── */

  /**
   * Reserve each line from one batch. The `updateMany … where available >= q`
   * is the oversell guard: two concurrent checkouts both read "1 left", but
   * only one UPDATE matches the row, the other gets count 0 and rolls back.
   */
  private async reserveStock(
    tx: Tx,
    orderId: string,
    lines: Array<{
      itemId: string;
      productId: string;
      name: string;
      quantity: number;
    }>,
  ): Promise<void> {
    // Belt and braces: a retry after `failed` must not double-reserve.
    await this.releaseReservations(tx, orderId);

    for (const line of lines) {
      // Oldest roast first — sell through stock in the order it was made.
      const candidate = await tx.inventory.findFirst({
        where: {
          status: true,
          available: { gte: line.quantity },
          batch: { productId: line.productId, isActive: true },
        },
        orderBy: { batch: { roastDate: 'asc' } },
        select: { id: true },
      });

      if (!candidate) {
        const total = await this.orders.availableUnits(line.productId);
        throw new ConflictException(
          total === 0
            ? `${line.name} is out of stock.`
            : `Only ${total} of ${line.name} left in stock.`,
        );
      }

      const reserved = await tx.inventory.updateMany({
        where: { id: candidate.id, available: { gte: line.quantity } },
        data: {
          reserved: { increment: line.quantity },
          available: { decrement: line.quantity },
        },
      });

      if (reserved.count === 0) {
        // Lost the race between findFirst and updateMany.
        throw new ConflictException(
          `${line.name} was just bought by someone else. Please try again.`,
        );
      }

      await tx.stockReservation.create({
        data: {
          orderId,
          orderItemId: line.itemId,
          inventoryId: candidate.id,
          quantity: line.quantity,
        },
      });
    }
  }

  /** Give held units back to `available`. Safe to call when nothing is held. */
  private async releaseReservations(tx: Tx, orderId: string): Promise<void> {
    const reservations = await tx.stockReservation.findMany({
      where: { orderId },
    });
    for (const reservation of reservations) {
      await tx.inventory.update({
        where: { id: reservation.inventoryId },
        data: {
          reserved: { decrement: reservation.quantity },
          available: { increment: reservation.quantity },
        },
      });
    }
    if (reservations.length > 0) {
      await tx.stockReservation.deleteMany({ where: { orderId } });
    }
  }

  /**
   * Turn held units into sold units. `available` was already reduced at
   * reservation time, so only onHand and reserved move here.
   *
   * Returns false when nothing was reserved (payment arrived after the hold
   * had expired) — the caller then deducts directly.
   */
  private async commitReservations(tx: Tx, orderId: string): Promise<boolean> {
    const reservations = await tx.stockReservation.findMany({
      where: { orderId },
    });
    if (reservations.length === 0) return false;

    for (const reservation of reservations) {
      await tx.inventory.update({
        where: { id: reservation.inventoryId },
        data: {
          onHand: { decrement: reservation.quantity },
          reserved: { decrement: reservation.quantity },
        },
      });
    }
    await tx.stockReservation.deleteMany({ where: { orderId } });
    return true;
  }

  /**
   * Late payment: the hold expired, stock went back on sale, and then the
   * provider says "paid". Money has moved, so the order IS paid — take the
   * units from whatever is available and flag the order if we've oversold.
   */
  private async deductWithoutReservation(
    tx: Tx,
    order: CartRecord,
  ): Promise<string | null> {
    const shortages: string[] = [];

    for (const item of order.items) {
      const candidate = await tx.inventory.findFirst({
        where: {
          status: true,
          available: { gte: item.quantity },
          batch: { productId: item.productVariant.product.id, isActive: true },
        },
        orderBy: { batch: { roastDate: 'asc' } },
        select: { id: true },
      });

      if (!candidate) {
        shortages.push(`${item.productVariant.product.name} ×${item.quantity}`);
        continue;
      }

      await tx.inventory.update({
        where: { id: candidate.id },
        data: {
          onHand: { decrement: item.quantity },
          available: { decrement: item.quantity },
        },
      });
    }

    return shortages.length > 0
      ? `Paid after hold expired; stock short for: ${shortages.join(', ')}. Needs manual review.`
      : null;
  }

  /* ─── Transitions ────────────────────────────────────────────────── */

  private async markPaid(
    orderId: string,
    settled: { providerRef: string; amountCents?: number; currency?: string },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: cartInclude,
      });
      if (!order) throw new NotFoundException(`Order ${orderId} not found`);
      if (order.status === 'paid') return; // replay — nothing to do

      // Tamper check: the provider must have collected exactly what we
      // asked for. A mismatch is not a "paid" — it is an incident.
      const amountMismatch =
        settled.amountCents !== undefined &&
        settled.amountCents !== order.totalCents;
      const currencyMismatch =
        settled.currency !== undefined && settled.currency !== order.currency;
      if (amountMismatch || currencyMismatch) {
        this.logger.error(
          `Order ${orderId}: provider settled ${settled.amountCents} ${settled.currency}, expected ${order.totalCents} ${order.currency}`,
        );
        await tx.order.update({
          where: { id: orderId },
          data: {
            failureReason: `Payment amount mismatch (got ${settled.amountCents} ${settled.currency}). Needs manual review.`,
          },
        });
        return;
      }

      const committed = await this.commitReservations(tx, orderId);
      const note = committed
        ? null
        : await this.deductWithoutReservation(tx, order);

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paymentIntentId: order.paymentIntentId ?? settled.providerRef,
          paymentExpiresAt: null,
          failureReason: note,
          // The cart's life ends here; the next visit starts fresh.
          cartToken: null,
        },
      });
    });
  }

  private async markFailed(orderId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });
      if (!order || order.status === 'paid' || order.status === 'failed')
        return;

      await this.releaseReservations(tx, orderId);
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'failed',
          failureReason: reason,
          paymentExpiresAt: null,
        },
      });
    });
  }

  private expireOrder(orderId: string, reason: string) {
    return this.markFailed(orderId, reason);
  }

  /* ─── Webhooks ───────────────────────────────────────────────────── */

  async handleWebhook(
    route: string,
    rawBody: Buffer | undefined,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true; duplicate?: true; ignored?: true }> {
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException('Empty webhook body');
    }

    const provider = this.providers.byRoute(route);
    // Throws 400 on a bad signature — nothing below runs for forged requests.
    const event = await provider.verifyWebhook(rawBody, headers);

    if (event.type === 'ignored') {
      return { received: true, ignored: true };
    }

    // Insert-first dedupe: WebhookLog.eventId is unique, so a redelivery
    // fails here with P2002 and we answer 200 without touching the order.
    try {
      await this.prisma.webhookLog.create({
        data: {
          provider: route,
          eventId: event.eventId,
          eventType: event.type,
          payload: event.raw as Prisma.InputJsonValue,
          status: 'success',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { received: true, duplicate: true };
      }
      throw error;
    }

    try {
      await this.applyEvent(provider, event);
      await this.prisma.webhookLog.update({
        where: { eventId: event.eventId },
        data: { processedAt: new Date() },
      });
    } catch (error) {
      // Release the eventId so the provider's retry can be processed, and
      // keep a failed row for forensics under a distinct id.
      const message = (error as Error).message ?? 'unknown error';
      await this.prisma.webhookLog
        .delete({ where: { eventId: event.eventId } })
        .catch(() => undefined);
      await this.prisma.webhookLog
        .create({
          data: {
            provider: route,
            eventId: `${event.eventId}:failed:${Date.now()}`,
            eventType: event.type,
            payload: event.raw as Prisma.InputJsonValue,
            status: 'fail',
            errorMessage: message.slice(0, 500),
          },
        })
        .catch(() => undefined);
      throw error;
    }

    return { received: true };
  }

  private async applyEvent(
    provider: PaymentProvider,
    event: WebhookEvent,
  ): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: event.orderId
        ? { id: event.orderId }
        : { paymentIntentId: event.providerRef },
      select: { id: true, status: true, paymentIntentId: true },
    });

    if (!order) {
      // Not ours (or a session from a wiped dev DB). Log and stop; a 4xx
      // would make the provider retry forever.
      this.logger.warn(
        `Webhook for unknown order (ref ${event.providerRef}) ignored`,
      );
      return;
    }

    if (order.paymentIntentId && order.paymentIntentId !== event.providerRef) {
      // A stale session from an earlier attempt on the same order.
      this.logger.warn(
        `Webhook ref ${event.providerRef} does not match order ${order.id} (${order.paymentIntentId}); ignored`,
      );
      return;
    }

    if (event.type === 'paid') {
      let settled = {
        amountCents: event.amountCents,
        currency: event.currency,
      };

      // Chapa's webhook is a notification; its verify endpoint is the truth.
      if (provider.name === 'chapa') {
        const verified = await provider.fetchStatus(event.providerRef);
        if (verified.status !== 'paid') {
          this.logger.warn(
            `Chapa webhook said paid but verify says ${verified.status} for ${event.providerRef}`,
          );
          if (verified.status === 'failed') {
            await this.markFailed(order.id, 'The payment was not completed.');
          }
          return;
        }
        settled = {
          amountCents: verified.amountCents,
          currency: verified.currency,
        };
      }

      await this.markPaid(order.id, {
        providerRef: event.providerRef,
        ...settled,
      });
      return;
    }

    if (event.type === 'failed') {
      await this.markFailed(
        order.id,
        event.reason ?? 'The payment was not completed.',
      );
    }
  }

  /* ─── Status / reconciliation ────────────────────────────────────── */

  /**
   * What the return page polls. If the webhook is slow, ask the provider
   * directly (at most once every few seconds per order) so the shopper is not
   * left staring at a spinner.
   */
  async getStatus(orderId: string): Promise<CheckoutStatusResponse> {
    let order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentProvider: true,
        paymentIntentId: true,
        totalCents: true,
        currency: true,
        paymentExpiresAt: true,
        failureReason: true,
      },
    });

    if (!order || order.status === 'cart') {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status === 'pending' &&
      order.paymentIntentId &&
      order.paymentProvider
    ) {
      const shouldReconcile = await this.claimReconcile(orderId);
      if (shouldReconcile) {
        await this.reconcile(
          order.id,
          order.paymentProvider as PaymentProviderName,
          order.paymentIntentId,
          order.currency,
        );
        order = (await this.prisma.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            status: true,
            paymentProvider: true,
            paymentIntentId: true,
            totalCents: true,
            currency: true,
            paymentExpiresAt: true,
            failureReason: true,
          },
        }))!;
      }
    }

    return {
      orderId: order.id,
      status: order.status,
      paymentProvider: order.paymentProvider,
      totalCents: order.totalCents,
      currency: order.currency,
      paymentExpiresAt: order.paymentExpiresAt?.toISOString() ?? null,
      failureReason: order.failureReason,
    };
  }

  private async claimReconcile(orderId: string): Promise<boolean> {
    const redis = this.redisOrNull();
    if (!redis) return true;
    try {
      return (await this.tryClaimReconcile(redis, orderId)) === 'OK';
    } catch {
      return true; // reconciling too often is harmless; not reconciling is not
    }
  }

  private tryClaimReconcile(redis: Redis, orderId: string) {
    return redis.set(
      `reconcile:${orderId}`,
      '1',
      'EX',
      RECONCILE_THROTTLE_SECONDS,
      'NX',
    );
  }

  private async reconcile(
    orderId: string,
    providerName: PaymentProviderName,
    providerRef: string,
    currency: CartRecord['currency'],
  ): Promise<void> {
    try {
      const provider = this.providers.resolve(providerName, currency);
      const status = await provider.fetchStatus(providerRef);
      if (status.status === 'paid') {
        await this.markPaid(orderId, {
          providerRef,
          amountCents: status.amountCents,
          currency: status.currency,
        });
      } else if (status.status === 'failed') {
        await this.markFailed(orderId, 'The payment was not completed.');
      }
    } catch (error) {
      // Reconciliation is best-effort; the webhook or the sweeper will finish it.
      this.logger.warn(
        `Reconcile failed for ${orderId}: ${(error as Error).message}`,
      );
    }
  }

  /* ─── Expiry sweeper ─────────────────────────────────────────────── */

  /**
   * Every minute: release holds whose deadline passed. Before failing an
   * order we ask the provider once — a lost webhook must not turn a real
   * payment into a "failed" with released stock.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sweepExpiredHolds(): Promise<number> {
    const stale = await this.prisma.order.findMany({
      where: { status: 'pending', paymentExpiresAt: { lt: new Date() } },
      select: {
        id: true,
        paymentProvider: true,
        paymentIntentId: true,
        currency: true,
      },
      take: SWEEP_BATCH,
      orderBy: { paymentExpiresAt: 'asc' },
    });

    let swept = 0;
    for (const order of stale) {
      try {
        if (order.paymentIntentId && order.paymentProvider) {
          await this.reconcile(
            order.id,
            order.paymentProvider as PaymentProviderName,
            order.paymentIntentId,
            order.currency,
          );
        }
        // reconcile() may have moved it to paid/failed; only expire what is still pending.
        const current = await this.prisma.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });
        if (current?.status === 'pending') {
          await this.expireOrder(
            order.id,
            'The payment page expired before payment was completed.',
          );
        }
        swept += 1;
      } catch (error) {
        this.logger.error(
          `Sweep failed for ${order.id}: ${(error as Error).message}`,
        );
      }
    }

    if (swept > 0) this.logger.log(`Swept ${swept} expired checkout hold(s).`);
    return swept;
  }
}
