import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentSettlementService } from './payment-settlement.service';

jest.mock('stripe', () => ({ __esModule: true, default: jest.fn() }));

describe('Stripe payments', () => {
  const originalEnv = { ...process.env };
  const client = {
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
    webhooks: { constructEvent: jest.fn() },
  };
  const prisma = { order: { findFirst: jest.fn(), update: jest.fn() } };
  const settlement = { markPaid: jest.fn() };
  let service: StripeService;
  const order = {
    id: 'order',
    status: 'pending',
    totalCents: 12000,
    currency: 'USD',
    contactEmail: 'test@example.com',
    contactName: 'Test User',
    contactPhone: null,
  };
  const paidSession = {
    id: 'cs_test',
    client_reference_id: 'order',
    amount_total: 12000,
    currency: 'usd',
    payment_status: 'paid',
    status: 'complete',
  };
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_example';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_example';
    jest.mocked(Stripe).mockImplementation(() => client as unknown as Stripe);
    prisma.order.findFirst.mockResolvedValue(order);
    client.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test',
      url: 'https://checkout.stripe.com/test',
    });
    client.checkout.sessions.retrieve.mockResolvedValue(paidSession);
    service = new StripeService(
      prisma as unknown as PrismaService,
      settlement as unknown as PaymentSettlementService,
    );
  });
  afterAll(() => {
    process.env = originalEnv;
  });
  it('creates a hosted session using the server total and persists its reference', async () => {
    expect(await service.initializeForOrder(order)).toEqual({
      checkoutUrl: 'https://checkout.stripe.com/test',
    });
    expect(client.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        client_reference_id: 'order',
        success_url: expect.stringContaining(
          'session_id={CHECKOUT_SESSION_ID}',
        ),
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'usd',
              unit_amount: 12000,
            }),
          }),
        ],
      }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order' },
      data: { paymentIntentId: 'cs_test' },
    });
  });
  it('settles a matching paid session', async () => {
    expect(await service.verify('cs_test')).toEqual({
      orderId: 'order',
      status: 'paid',
    });
    expect(settlement.markPaid).toHaveBeenCalledWith('order');
  });
  it('keeps unpaid sessions pending', async () => {
    client.checkout.sessions.retrieve.mockResolvedValueOnce({
      ...paidSession,
      payment_status: 'unpaid',
    });
    expect(await service.verify('cs_test')).toEqual({
      orderId: 'order',
      status: 'pending',
    });
    expect(settlement.markPaid).not.toHaveBeenCalled();
  });
  it.each([
    { amount_total: 1 },
    { currency: 'etb' },
    { client_reference_id: 'other' },
  ])('rejects mismatched session details %j', async (mismatch) => {
    client.checkout.sessions.retrieve.mockResolvedValueOnce({
      ...paidSession,
      ...mismatch,
    });
    await expect(service.verify('cs_test')).rejects.toThrow('Payment details');
    expect(settlement.markPaid).not.toHaveBeenCalled();
  });
  it.each([
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
  ])('verifies signed %s events', async (type) => {
    client.webhooks.constructEvent.mockReturnValueOnce({
      type,
      data: { object: { id: 'cs_test' } },
    });
    const body = Buffer.from('{}');
    expect(await service.handleWebhook(body, 'signature')).toEqual({
      handled: true,
    });
    expect(client.webhooks.constructEvent).toHaveBeenCalledWith(
      body,
      'signature',
      'whsec_example',
    );
  });
  it('rejects invalid webhook signatures', async () => {
    client.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error('bad signature');
    });
    await expect(
      service.handleWebhook(Buffer.from('{}'), 'bad'),
    ).rejects.toThrow('Invalid webhook signature');
    expect(client.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });
});
