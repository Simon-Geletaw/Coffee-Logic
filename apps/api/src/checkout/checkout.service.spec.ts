import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS } from 'src/redis/redis.constants';
import { OrdersService } from 'src/orders/orders.service';
import { ShippingService } from 'src/shipping/shipping.service';
import { PaymentProviderRegistry } from 'src/payments/payment-provider.registry';
import type {
  PaymentProvider,
  WebhookEvent,
} from 'src/payments/payment-provider.interface';
import { CheckoutService } from './checkout.service';

/* ─── Fixtures ───────────────────────────────────────────────────────── */

const ORDER_ID = 'order-1';
const TOKEN = 'tok';

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    cartToken: TOKEN,
    status: 'cart',
    currency: 'USD',
    subtotalCents: 0,
    shippingCents: 0,
    totalCents: 2400,
    totalWeightGrams: 0,
    paymentProvider: null,
    paymentIntentId: null,
    paymentExpiresAt: null,
    paidAt: null,
    failureReason: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    shippingAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item-1',
        productVariantId: 'var-1',
        quantity: 2,
        unitPriceCents: 1200,
        lineTotalCents: 2400,
        productVariant: {
          id: 'var-1',
          weightGrams: 250,
          priceCents: 1200,
          currency: 'USD',
          sku: 'SKU',
          isActive: true,
          product: {
            id: 'prod-1',
            name: 'Yirgacheffe',
            origin: 'Ethiopia',
            roastLevel: 'light',
            grind: 'whole-bean',
            imageUrl: null,
            isActive: true,
          },
        },
      },
    ],
    ...overrides,
  };
}

const ACTIVE_VARIANT = {
  priceCents: 1200,
  weightGrams: 250,
  isActive: true,
  currency: 'USD',
  product: { id: 'prod-1', name: 'Yirgacheffe', isActive: true },
};

function makePrisma() {
  const prisma = {
    order: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    orderItem: { update: jest.fn().mockResolvedValue({}) },
    productVariant: { findUnique: jest.fn().mockResolvedValue(ACTIVE_VARIANT) },
    inventory: {
      findFirst: jest.fn().mockResolvedValue({ id: 'inv-1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    stockReservation: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    webhookLog: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
  };
  // Interactive transactions just run the callback against the same mock.
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn(prisma),
  );
  return prisma;
}

function makeProvider(
  name: 'stripe' | 'chapa' = 'stripe',
): jest.Mocked<PaymentProvider> {
  return {
    name,
    supports: jest.fn().mockReturnValue(true),
    createSession: jest
      .fn()
      .mockResolvedValue({ providerRef: 'cs_1', redirectUrl: 'https://pay/1' }),
    verifyWebhook: jest.fn(),
    fetchStatus: jest.fn().mockResolvedValue({ status: 'pending' }),
  } as unknown as jest.Mocked<PaymentProvider>;
}

function makeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn((key: string, value: string, ...args: unknown[]) => {
      if (args.includes('NX') && store.has(key)) return Promise.resolve(null);
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) => Promise.resolve(store.delete(key) ? 1 : 0)),
  };
}

const dto = {
  contactName: 'Selam Tadesse',
  contactEmail: 'selam@example.com',
  contactPhone: undefined,
  shippingAddress: 'Bole, Addis Ababa, near Edna Mall',
  paymentProvider: 'stripe' as const,
};

/* ─── Harness ────────────────────────────────────────────────────────── */

async function build(
  options: {
    redis?: ReturnType<typeof makeRedis> | null;
    provider?: jest.Mocked<PaymentProvider>;
  } = {},
) {
  const prisma = makePrisma();
  const provider = options.provider ?? makeProvider();
  const orders = {
    requireCart: jest.fn().mockResolvedValue(makeOrder()),
    availableUnits: jest.fn().mockResolvedValue(10),
  };
  const shipping = {
    quote: jest.fn().mockResolvedValue({ cents: 800, label: 'Up to 500 g' }),
  };
  const registry = {
    resolve: jest.fn().mockReturnValue(provider),
    byRoute: jest.fn().mockReturnValue(provider),
  };
  const config = {
    get: (key: string) =>
      ({
        CHECKOUT_HOLD_MINUTES: 30,
        WEB_ORIGIN: 'http://web',
        API_PUBLIC_URL: 'http://api',
      })[key],
  };

  const module = await Test.createTestingModule({
    providers: [
      CheckoutService,
      { provide: PrismaService, useValue: prisma },
      { provide: OrdersService, useValue: orders },
      { provide: ShippingService, useValue: shipping },
      { provide: PaymentProviderRegistry, useValue: registry },
      { provide: ConfigService, useValue: config },
      {
        provide: REDIS,
        useValue: options.redis === undefined ? null : options.redis,
      },
    ],
  }).compile();

  return {
    service: module.get(CheckoutService),
    prisma,
    provider,
    orders,
    shipping,
    registry,
  };
}

/* ─── createSession ──────────────────────────────────────────────────── */

describe('CheckoutService.createSession', () => {
  it('reserves stock atomically, flips the cart to pending, and returns the provider redirect', async () => {
    const { service, prisma, provider } = await build();

    const result = await service.createSession(TOKEN, dto, 'idem-1');

    expect(result).toEqual(
      expect.objectContaining({
        orderId: ORDER_ID,
        provider: 'stripe',
        redirectUrl: 'https://pay/1',
      }),
    );

    // The oversell guard: conditional update, not read-then-write.
    expect(prisma.inventory.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1', available: { gte: 2 } },
        data: { reserved: { increment: 2 }, available: { decrement: 2 } },
      }),
    );
    expect(prisma.stockReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: ORDER_ID,
          orderItemId: 'item-1',
          inventoryId: 'inv-1',
          quantity: 2,
        }),
      }),
    );

    // Totals are recomputed server-side: 2 × 1200 + 800 shipping.
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'pending',
          subtotalCents: 2400,
          shippingCents: 800,
          totalCents: 3200,
          totalWeightGrams: 500,
          paymentProvider: 'stripe',
        }),
      }),
    );
    expect(provider.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 3200,
        shippingCents: 800,
        idempotencyKey: 'idem-1',
      }),
    );
    // The provider ref is persisted after the session exists.
    expect(prisma.order.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { paymentIntentId: 'cs_1' } }),
    );
  });

  it('replays the cached response for the same Idempotency-Key without touching the cart', async () => {
    const redis = makeRedis();
    const cached = {
      orderId: ORDER_ID,
      provider: 'stripe',
      redirectUrl: 'https://pay/cached',
      expiresAt: new Date().toISOString(),
    };
    redis.store.set('idem:checkout:idem-1', JSON.stringify(cached));
    const { service, orders, provider } = await build({ redis });

    await expect(service.createSession(TOKEN, dto, 'idem-1')).resolves.toEqual(
      cached,
    );
    expect(orders.requireCart).not.toHaveBeenCalled();
    expect(provider.createSession).not.toHaveBeenCalled();
  });

  it('refuses an empty cart', async () => {
    const { service, orders } = await build();
    orders.requireCart.mockResolvedValue(makeOrder({ items: [] }));

    await expect(
      service.createSession(TOKEN, dto, 'idem-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hands back the open session when the cart is pending with a live hold', async () => {
    const redis = makeRedis();
    const live = {
      orderId: ORDER_ID,
      provider: 'stripe',
      redirectUrl: 'https://pay/open',
      expiresAt: '',
    };
    redis.store.set(`checkout:redirect:${ORDER_ID}`, JSON.stringify(live));
    const { service, orders, provider } = await build({ redis });
    orders.requireCart.mockResolvedValue(
      makeOrder({
        status: 'pending',
        paymentExpiresAt: new Date(Date.now() + 10 * 60_000),
      }),
    );

    await expect(service.createSession(TOKEN, dto, 'idem-2')).resolves.toEqual(
      live,
    );
    expect(provider.createSession).not.toHaveBeenCalled();
  });

  it('refuses with 409 when pending with a live hold and no cached redirect', async () => {
    const { service, orders } = await build();
    orders.requireCart.mockResolvedValue(
      makeOrder({
        status: 'pending',
        paymentExpiresAt: new Date(Date.now() + 10 * 60_000),
      }),
    );

    await expect(
      service.createSession(TOKEN, dto, 'idem-2'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('expires a lapsed pending hold and proceeds as a retry', async () => {
    const { service, prisma, orders, provider } = await build();
    orders.requireCart.mockResolvedValue(
      makeOrder({
        status: 'pending',
        paymentExpiresAt: new Date(Date.now() - 60_000),
      }),
    );
    prisma.order.findUnique.mockResolvedValue({ status: 'pending' });

    await service.createSession(TOKEN, dto, 'idem-3');

    // First the expiry (status failed), then a fresh reservation + session.
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
    expect(provider.createSession).toHaveBeenCalledTimes(1);
  });

  it('rolls the hold back and returns 503 when the provider fails', async () => {
    const { service, prisma, provider } = await build();
    provider.createSession.mockRejectedValue(new Error('stripe down'));
    prisma.stockReservation.findMany
      .mockResolvedValueOnce([]) // pre-reserve cleanup
      .mockResolvedValueOnce([{ inventoryId: 'inv-1', quantity: 2 }]); // release on failure

    await expect(
      service.createSession(TOKEN, dto, 'idem-4'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: { reserved: { decrement: 2 }, available: { increment: 2 } },
      }),
    );
    expect(prisma.order.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'cart',
          paymentExpiresAt: null,
        }),
      }),
    );
  });

  it('fails with 409 when the conditional update matches no row (lost the race)', async () => {
    const { service, prisma } = await build();
    prisma.inventory.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.createSession(TOKEN, dto, 'idem-5')).rejects.toThrow(
      /just bought/,
    );
  });

  it('fails with 409 and the remaining count when no single batch can cover the line', async () => {
    const { service, prisma, orders } = await build();
    prisma.inventory.findFirst.mockResolvedValue(null);
    orders.availableUnits.mockResolvedValue(1);

    await expect(service.createSession(TOKEN, dto, 'idem-6')).rejects.toThrow(
      /Only 1 of/,
    );
  });

  it('says out of stock when nothing is left at all', async () => {
    const { service, prisma, orders } = await build();
    prisma.inventory.findFirst.mockResolvedValue(null);
    orders.availableUnits.mockResolvedValue(0);

    await expect(service.createSession(TOKEN, dto, 'idem-7')).rejects.toThrow(
      /out of stock/,
    );
  });

  it('refuses a variant that was retired since it was added', async () => {
    const { service, prisma } = await build();
    prisma.productVariant.findUnique.mockResolvedValue({
      ...ACTIVE_VARIANT,
      isActive: false,
    });

    await expect(
      service.createSession(TOKEN, dto, 'idem-8'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('re-prices a line whose variant price changed since it was added', async () => {
    const { service, prisma, provider } = await build();
    prisma.productVariant.findUnique.mockResolvedValue({
      ...ACTIVE_VARIANT,
      priceCents: 1500,
    });

    await service.createSession(TOKEN, dto, 'idem-9');

    expect(prisma.orderItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { unitPriceCents: 1500, lineTotalCents: 3000 },
      }),
    );
    expect(provider.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 3800 }),
    );
  });

  it('refuses when shipping cannot be priced for this weight', async () => {
    const { service, shipping, provider } = await build();
    shipping.quote.mockRejectedValue(
      new UnprocessableEntityException('no tier'),
    );

    await expect(
      service.createSession(TOKEN, dto, 'idem-10'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(provider.createSession).not.toHaveBeenCalled();
  });

  it('refuses a second concurrent checkout for the same cart (lock held)', async () => {
    const redis = makeRedis();
    redis.store.set(`lock:checkout:${ORDER_ID}`, '1');
    const { service } = await build({ redis });

    await expect(
      service.createSession(TOKEN, dto, 'idem-11'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

/* ─── handleWebhook ──────────────────────────────────────────────────── */

const paidEvent: WebhookEvent = {
  eventId: 'evt_1',
  type: 'paid',
  providerRef: 'cs_1',
  orderId: ORDER_ID,
  amountCents: 2400,
  currency: 'USD',
  raw: { id: 'evt_1' },
};

describe('CheckoutService.handleWebhook', () => {
  const headers = { 'stripe-signature': 'sig' };

  it('rejects an empty body before touching the provider', async () => {
    const { service, provider } = await build();
    await expect(
      service.handleWebhook('stripe', Buffer.alloc(0), headers),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.verifyWebhook).not.toHaveBeenCalled();
  });

  it('propagates a signature failure and logs nothing', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockRejectedValue(
      new BadRequestException('bad sig'),
    );

    await expect(
      service.handleWebhook('stripe', Buffer.from('{}'), headers),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.webhookLog.create).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('answers 200 and changes nothing for an ignored event type', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue({ ...paidEvent, type: 'ignored' });

    await expect(
      service.handleWebhook('stripe', Buffer.from('{}'), headers),
    ).resolves.toEqual({ received: true, ignored: true });
    expect(prisma.webhookLog.create).not.toHaveBeenCalled();
  });

  it('de-duplicates on eventId: a replay is acknowledged without touching the order', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue(paidEvent);
    prisma.webhookLog.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.handleWebhook('stripe', Buffer.from('{}'), headers),
    ).resolves.toEqual({ received: true, duplicate: true });
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it('marks the order paid: commits the reservation, nulls the cart token, stamps paidAt', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue(paidEvent);
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'pending',
      paymentIntentId: 'cs_1',
    });
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({ status: 'pending', paymentIntentId: 'cs_1' }),
    );
    prisma.stockReservation.findMany.mockResolvedValue([
      { inventoryId: 'inv-1', quantity: 2 },
    ]);

    await expect(
      service.handleWebhook('stripe', Buffer.from('{}'), headers),
    ).resolves.toEqual({ received: true });

    // Sold: onHand and reserved both drop; available was already reduced at reservation.
    expect(prisma.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: { onHand: { decrement: 2 }, reserved: { decrement: 2 } },
      }),
    );
    expect(prisma.stockReservation.deleteMany).toHaveBeenCalledWith({
      where: { orderId: ORDER_ID },
    });
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'paid',
          cartToken: null,
          paidAt: expect.any(Date),
          paymentExpiresAt: null,
        }),
      }),
    );
    expect(prisma.webhookLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: 'evt_1' },
        data: { processedAt: expect.any(Date) },
      }),
    );
  });

  it('is a no-op for an order that is already paid', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue({
      ...paidEvent,
      eventId: 'evt_2',
    });
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'paid',
      paymentIntentId: 'cs_1',
    });
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({ status: 'paid', paymentIntentId: 'cs_1' }),
    );

    await service.handleWebhook('stripe', Buffer.from('{}'), headers);

    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.inventory.update).not.toHaveBeenCalled();
  });

  it('flags an amount mismatch for review instead of marking paid', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue({ ...paidEvent, amountCents: 1 });
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'pending',
      paymentIntentId: 'cs_1',
    });
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({ status: 'pending', paymentIntentId: 'cs_1' }),
    );

    await service.handleWebhook('stripe', Buffer.from('{}'), headers);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failureReason: expect.stringMatching(/mismatch/i) },
      }),
    );
    expect(prisma.order.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'paid' }),
      }),
    );
  });

  it('flags a currency mismatch the same way', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue({ ...paidEvent, currency: 'ETB' });
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'pending',
      paymentIntentId: 'cs_1',
    });
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({ status: 'pending', paymentIntentId: 'cs_1' }),
    );

    await service.handleWebhook('stripe', Buffer.from('{}'), headers);

    expect(prisma.order.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'paid' }),
      }),
    );
  });

  it('marks failed and releases the reservation', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue({
      ...paidEvent,
      type: 'failed',
      reason: 'Card declined',
    });
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'pending',
      paymentIntentId: 'cs_1',
    });
    prisma.order.findUnique.mockResolvedValue({ status: 'pending' });
    prisma.stockReservation.findMany.mockResolvedValue([
      { inventoryId: 'inv-1', quantity: 2 },
    ]);

    await service.handleWebhook('stripe', Buffer.from('{}'), headers);

    expect(prisma.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reserved: { decrement: 2 }, available: { increment: 2 } },
      }),
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'failed',
          failureReason: 'Card declined',
          paymentExpiresAt: null,
        },
      }),
    );
  });

  it('never fails an order that is already paid (paid wins over a late failure)', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue({ ...paidEvent, type: 'failed' });
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'paid',
      paymentIntentId: 'cs_1',
    });
    prisma.order.findUnique.mockResolvedValue({ status: 'paid' });

    await service.handleWebhook('stripe', Buffer.from('{}'), headers);

    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('acknowledges an event for an unknown order without throwing (no infinite retries)', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue(paidEvent);
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(
      service.handleWebhook('stripe', Buffer.from('{}'), headers),
    ).resolves.toEqual({ received: true });
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('ignores a stale providerRef from an earlier attempt on the same order', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue({
      ...paidEvent,
      providerRef: 'cs_OLD',
    });
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'pending',
      paymentIntentId: 'cs_NEW',
    });

    await service.handleWebhook('stripe', Buffer.from('{}'), headers);

    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('on a processing error: frees the eventId, records a failed row, and rethrows so the provider retries', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue(paidEvent);
    prisma.order.findFirst.mockRejectedValue(new Error('db down'));

    await expect(
      service.handleWebhook('stripe', Buffer.from('{}'), headers),
    ).rejects.toThrow('db down');

    expect(prisma.webhookLog.delete).toHaveBeenCalledWith({
      where: { eventId: 'evt_1' },
    });
    expect(prisma.webhookLog.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'fail',
          errorMessage: 'db down',
          eventId: expect.stringContaining('evt_1:failed:'),
        }),
      }),
    );
  });

  it('Chapa: trusts the verify endpoint over the webhook body', async () => {
    const chapa = makeProvider('chapa');
    const { service, prisma } = await build({ provider: chapa });
    chapa.verifyWebhook.mockResolvedValue({
      ...paidEvent,
      providerRef: 'tx_1',
    });
    chapa.fetchStatus.mockResolvedValue({ status: 'failed' });
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'pending',
      paymentIntentId: 'tx_1',
    });
    prisma.order.findUnique.mockResolvedValue({ status: 'pending' });

    await service.handleWebhook('chapa', Buffer.from('{}'), {
      'x-chapa-signature': 's',
    });

    expect(chapa.fetchStatus).toHaveBeenCalledWith('tx_1');
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });

  it('Chapa: uses the verified amount, not the webhook amount, for the tamper check', async () => {
    const chapa = makeProvider('chapa');
    const { service, prisma } = await build({ provider: chapa });
    chapa.verifyWebhook.mockResolvedValue({
      ...paidEvent,
      providerRef: 'tx_1',
      amountCents: 1,
    }); // lying webhook
    chapa.fetchStatus.mockResolvedValue({
      status: 'paid',
      amountCents: 2400,
      currency: 'USD',
    });
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'pending',
      paymentIntentId: 'tx_1',
    });
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({ status: 'pending', paymentIntentId: 'tx_1' }),
    );

    await service.handleWebhook('chapa', Buffer.from('{}'), {
      'x-chapa-signature': 's',
    });

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'paid' }),
      }),
    );
  });

  it('late payment after the hold expired: deducts stock directly and still marks paid', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue(paidEvent);
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'failed',
      paymentIntentId: 'cs_1',
    });
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({ status: 'failed', paymentIntentId: 'cs_1' }),
    );
    prisma.stockReservation.findMany.mockResolvedValue([]); // nothing held any more

    await service.handleWebhook('stripe', Buffer.from('{}'), headers);

    expect(prisma.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { onHand: { decrement: 2 }, available: { decrement: 2 } },
      }),
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'paid', failureReason: null }),
      }),
    );
  });

  it('late payment with no stock left: marks paid but flags the shortage for review', async () => {
    const { service, provider, prisma } = await build();
    provider.verifyWebhook.mockResolvedValue(paidEvent);
    prisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: 'failed',
      paymentIntentId: 'cs_1',
    });
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({ status: 'failed', paymentIntentId: 'cs_1' }),
    );
    prisma.stockReservation.findMany.mockResolvedValue([]);
    prisma.inventory.findFirst.mockResolvedValue(null);

    await service.handleWebhook('stripe', Buffer.from('{}'), headers);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'paid',
          failureReason: expect.stringMatching(/short/i),
        }),
      }),
    );
  });
});

/* ─── getStatus + sweeper ────────────────────────────────────────────── */

describe('CheckoutService.getStatus', () => {
  it('404s for a cart that never started checkout', async () => {
    const { service, prisma } = await build();
    prisma.order.findUnique.mockResolvedValue({ id: ORDER_ID, status: 'cart' });
    await expect(service.getStatus(ORDER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reconciles a pending order with the provider and reports paid', async () => {
    const { service, prisma, provider } = await build();
    provider.fetchStatus.mockResolvedValue({
      status: 'paid',
      amountCents: 2400,
      currency: 'USD',
    });
    const pending = {
      ...makeOrder({
        status: 'pending',
        paymentProvider: 'stripe',
        paymentIntentId: 'cs_1',
      }),
    };
    prisma.order.findUnique
      .mockResolvedValueOnce(pending) // initial read
      .mockResolvedValueOnce(pending) // markPaid's read
      .mockResolvedValueOnce({ ...pending, status: 'paid' }); // re-read after reconcile

    const result = await service.getStatus(ORDER_ID);

    expect(provider.fetchStatus).toHaveBeenCalledWith('cs_1');
    expect(result.status).toBe('paid');
  });

  it('does not call the provider when the order is already settled', async () => {
    const { service, prisma, provider } = await build();
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({
        status: 'paid',
        paymentProvider: 'stripe',
        paymentIntentId: 'cs_1',
      }),
    );

    await service.getStatus(ORDER_ID);
    expect(provider.fetchStatus).not.toHaveBeenCalled();
  });
});

describe('CheckoutService.sweepExpiredHolds', () => {
  it('expires stale pending holds that the provider still reports as pending', async () => {
    const { service, prisma, provider } = await build();
    prisma.order.findMany.mockResolvedValue([
      {
        id: ORDER_ID,
        paymentProvider: 'stripe',
        paymentIntentId: 'cs_1',
        currency: 'USD',
      },
    ]);
    provider.fetchStatus.mockResolvedValue({ status: 'pending' });
    prisma.order.findUnique.mockResolvedValue({ status: 'pending' });

    await expect(service.sweepExpiredHolds()).resolves.toBe(1);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          failureReason: expect.stringMatching(/expired/i),
        }),
      }),
    );
  });

  it('does not expire an order that reconciliation just found paid', async () => {
    const { service, prisma, provider } = await build();
    prisma.order.findMany.mockResolvedValue([
      {
        id: ORDER_ID,
        paymentProvider: 'stripe',
        paymentIntentId: 'cs_1',
        currency: 'USD',
      },
    ]);
    provider.fetchStatus.mockResolvedValue({
      status: 'paid',
      amountCents: 2400,
      currency: 'USD',
    });
    prisma.order.findUnique
      .mockResolvedValueOnce(
        makeOrder({ status: 'pending', paymentIntentId: 'cs_1' }),
      ) // markPaid read
      .mockResolvedValueOnce({ status: 'paid' }); // post-reconcile check

    await service.sweepExpiredHolds();

    expect(prisma.order.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });

  it('keeps sweeping when one order throws', async () => {
    const { service, prisma } = await build();
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'bad',
        paymentProvider: null,
        paymentIntentId: null,
        currency: 'USD',
      },
      {
        id: 'good',
        paymentProvider: null,
        paymentIntentId: null,
        currency: 'USD',
      },
    ]);
    prisma.order.findUnique
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' });

    await expect(service.sweepExpiredHolds()).resolves.toBe(1);
  });
});
