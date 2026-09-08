/**
 * Integration: real Postgres (+ Redis when REDIS_URL is set), fake provider.
 *
 * Proves what unit tests cannot: the Prisma queries are valid, the
 * transaction + conditional UPDATE really prevent overselling under
 * concurrency, and the whole cart → session → webhook → paid path holds
 * against the actual schema.
 *
 * Needs DATABASE_URL (migrated). Run:  pnpm -C apps/api exec jest --config ./test/jest-e2e.json
 */
process.env.PAYMENTS_FAKE = 'true';
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const RUN = `e2e-${Date.now().toString(36)}`;

describe('Checkout (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let productId: string;
  let variantId: string;
  let inventoryId: string;
  // Whatever tier the seed (or a previous run) left for a 250 g USD cart.
  let shippingCents: number;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    // A USD shipping tier that certainly covers the test weight.
    await prisma.shippingRate.upsert({
      where: { currency_maxGrams: { currency: 'USD', maxGrams: 1_000_000 } },
      update: { isActive: true },
      create: {
        currency: 'USD',
        maxGrams: 1_000_000,
        cents: 2500,
        label: 'Over 2 kg',
      },
    });

    const product = await prisma.product.create({
      data: {
        name: `${RUN} Test Coffee`,
        roastLevel: 'light',
        grind: 'whole-bean',
        origin: 'Ethiopia',
        process: 'washed',
        caffeine: 'regular',
        variants: {
          create: {
            weightGrams: 250,
            priceCents: 1200,
            currency: 'USD',
            sku: `${RUN}-250`,
          },
        },
        batches: {
          create: {
            batchCode: `${RUN}-BATCH`,
            roastDate: new Date(),
            inventory: { create: { onHand: 1, reserved: 0, available: 1 } },
          },
        },
      },
      include: { variants: true, batches: { include: { inventory: true } } },
    });

    productId = product.id;
    variantId = product.variants[0].id;
    inventoryId = product.batches[0].inventory!.id;

    const tier = await prisma.shippingRate.findFirstOrThrow({
      where: { currency: 'USD', isActive: true, maxGrams: { gte: 250 } },
      orderBy: { maxGrams: 'asc' },
    });
    shippingCents = tier.cents;
  });

  afterAll(async () => {
    // Remove everything this run created, children first.
    const orders = await prisma.order.findMany({
      where: { items: { some: { productVariantId: variantId } } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    await prisma.stockReservation.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.webhookLog.deleteMany({
      where: { eventId: { contains: RUN } },
    });
    await prisma.inventory.deleteMany({ where: { batch: { productId } } });
    await prisma.batch.deleteMany({ where: { productId } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await app.close();
  });

  async function resetStock(units: number) {
    await prisma.stockReservation.deleteMany({ where: { inventoryId } });
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { onHand: units, reserved: 0, available: units },
    });
  }

  async function newCartWithOneUnit(): Promise<string> {
    const res = await http()
      .post('/cart/items')
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    return res.body.cartToken as string;
  }

  const contact = {
    contactName: 'Selam Tadesse',
    contactEmail: 'selam@example.com',
    shippingAddress: 'Bole, Addis Ababa, near Edna Mall',
    paymentProvider: 'stripe',
  };

  function openSession(token: string, key: string) {
    return http()
      .post('/checkout/session')
      .set('x-cart-token', token)
      .set('Idempotency-Key', key)
      .send(contact);
  }

  function fakeWebhook(orderId: string, type: 'paid' | 'failed', suffix = '') {
    return http()
      .post('/payments/fake/webhook')
      .set('x-fake-signature', 'fake')
      .send({
        providerRef: `fake_${orderId}`,
        type,
        eventId: `${RUN}:${orderId}:${type}${suffix}`,
      });
  }

  it('walks cart → session → webhook → paid, moving stock exactly once', async () => {
    await resetStock(1);
    const token = await newCartWithOneUnit();

    const cart = await http()
      .get('/cart')
      .set('x-cart-token', token)
      .expect(200);
    expect(cart.body).toMatchObject({
      status: 'cart',
      currency: 'USD',
      subtotalCents: 1200,
      shippingCents,
      totalCents: 1200 + shippingCents,
      totalWeightGrams: 250,
    });

    const key = `${RUN}-idem-1`;
    const session = await openSession(token, key).expect(201);
    expect(session.body).toMatchObject({ provider: 'stripe' });
    expect(session.body.redirectUrl).toContain('/checkout/return?order=');
    const orderId = session.body.orderId as string;

    // Reserved, not sold.
    let inv = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    expect(inv).toMatchObject({ onHand: 1, reserved: 1, available: 0 });

    // Cart is locked while pending.
    await http()
      .patch(`/cart/items/${cart.body.items[0].id}`)
      .set('x-cart-token', token)
      .send({ quantity: 2 })
      .expect(409);

    // Same key → same session, no second reservation.
    const replay = await openSession(token, key).expect(201);
    expect(replay.body.orderId).toBe(orderId);
    inv = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    expect(inv.reserved).toBe(1);

    await fakeWebhook(orderId, 'paid').expect(200).expect({ received: true });

    const status = await http().get(`/checkout/status/${orderId}`).expect(200);
    expect(status.body.status).toBe('paid');

    inv = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    expect(inv).toMatchObject({ onHand: 0, reserved: 0, available: 0 });
    expect(await prisma.stockReservation.count({ where: { orderId } })).toBe(0);

    // Redelivery is acknowledged and changes nothing.
    await fakeWebhook(orderId, 'paid')
      .expect(200)
      .expect({ received: true, duplicate: true });
    inv = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    expect(inv.onHand).toBe(0);

    // The token no longer resolves: paying ends the cart's life.
    const after = await http()
      .get('/cart')
      .set('x-cart-token', token)
      .expect(200);
    expect(after.body.items).toHaveLength(0);
  });

  it('two shoppers, one bag: exactly one checkout wins', async () => {
    await resetStock(1);
    const [tokenA, tokenB] = await Promise.all([
      newCartWithOneUnit(),
      newCartWithOneUnit(),
    ]);

    const [a, b] = await Promise.all([
      openSession(tokenA, `${RUN}-race-a`),
      openSession(tokenB, `${RUN}-race-b`),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);

    const inv = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    expect(inv).toMatchObject({ onHand: 1, reserved: 1, available: 0 });
    expect(
      await prisma.stockReservation.count({ where: { inventoryId } }),
    ).toBe(1);

    // Clean up the winner so later tests start from a known state.
    const winner = a.status === 201 ? a : b;
    await fakeWebhook(winner.body.orderId as string, 'failed').expect(200);
  });

  it('a failed payment releases the reservation and lets the shopper retry', async () => {
    await resetStock(1);
    const token = await newCartWithOneUnit();
    const session = await openSession(token, `${RUN}-fail-1`).expect(201);
    const orderId = session.body.orderId as string;

    await fakeWebhook(orderId, 'failed').expect(200);

    const inv = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    expect(inv).toMatchObject({ onHand: 1, reserved: 0, available: 1 });

    const cart = await http()
      .get('/cart')
      .set('x-cart-token', token)
      .expect(200);
    expect(cart.body.status).toBe('failed');
    expect(cart.body.failureReason).toMatch(/declined/i);

    // Retry opens a fresh session on the same order.
    const retry = await openSession(token, `${RUN}-fail-2`).expect(201);
    expect(retry.body.orderId).toBe(orderId);
    await fakeWebhook(orderId, 'failed', ':2').expect(200);
  });

  it('rejects a webhook without a valid signature and logs nothing', async () => {
    const before = await prisma.webhookLog.count();
    await http()
      .post('/payments/fake/webhook')
      .send({ providerRef: 'fake_nope', type: 'paid' })
      .expect(400);
    expect(await prisma.webhookLog.count()).toBe(before);
  });

  it('requires an Idempotency-Key', async () => {
    await resetStock(1);
    const token = await newCartWithOneUnit();
    await http()
      .post('/checkout/session')
      .set('x-cart-token', token)
      .send(contact)
      .expect(400);
  });
});
