import { createHmac } from 'node:crypto';
import { ChapaService } from './chapa.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentSettlementService } from './payment-settlement.service';

describe('Chapa payments', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const order = {
    id: 'order',
    status: 'pending',
    totalCents: 12000,
    currency: 'ETB',
  };
  const prisma = {
    order: { findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  };
  const settlement = { markPaid: jest.fn() };
  let service: ChapaService;
  let fetchMock: jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CHAPA_SECRET_KEY = 'CHASECK_TEST-example';
    process.env.CHAPA_WEBHOOK_SECRET = 'test-webhook-secret';
    prisma.order.findFirst.mockResolvedValue(order);
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new ChapaService(
      prisma as unknown as PrismaService,
      settlement as unknown as PaymentSettlementService,
    );
  });
  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });
  const response = (data: object) => ({
    ok: true,
    json: async () => ({ status: 'success', data }),
  });

  it('does not treat a successful lookup as a successful payment', async () => {
    fetchMock.mockResolvedValue(response({ status: 'pending' }));
    expect(await service.verify('ref')).toEqual({
      orderId: 'order',
      status: 'pending',
    });
    expect(settlement.markPaid).not.toHaveBeenCalled();
  });
  it('settles a verified payment with matching details', async () => {
    fetchMock.mockResolvedValue(
      response({
        status: 'success',
        tx_ref: 'ref',
        amount: '120.00',
        currency: 'ETB',
        mode: 'test',
      }),
    );
    expect(await service.verify('ref')).toEqual({
      orderId: 'order',
      status: 'paid',
    });
    expect(settlement.markPaid).toHaveBeenCalledWith('order');
  });
  it.each([
    { amount: '1.00' },
    { currency: 'USD' },
    { tx_ref: 'other' },
    { mode: 'live' },
  ])('rejects mismatched payment details: %j', async (mismatch) => {
    fetchMock.mockResolvedValue(
      response({
        status: 'success',
        tx_ref: 'ref',
        amount: '120.00',
        currency: 'ETB',
        mode: 'test',
        ...mismatch,
      }),
    );
    await expect(service.verify('ref')).rejects.toThrow('Payment details');
    expect(settlement.markPaid).not.toHaveBeenCalled();
  });
  it('re-verifies webhook payloads with the provider', async () => {
    fetchMock.mockResolvedValue(response({ status: 'pending' }));
    expect(
      await service.handleWebhook({ tx_ref: 'ref', status: 'success' }),
    ).toEqual({ handled: false });
    expect(settlement.markPaid).not.toHaveBeenCalled();
  });
  it('accepts both documented signature headers and rejects tampering', () => {
    const body = Buffer.from('{"tx_ref":"ref"}');
    const sign = (data: Buffer | string) =>
      createHmac('sha256', 'test-webhook-secret').update(data).digest('hex');
    expect(service.verifyWebhookSignature(body, sign(body))).toBe(true);
    expect(
      service.verifyWebhookSignature(
        body,
        undefined,
        sign('test-webhook-secret'),
      ),
    ).toBe(true);
    expect(service.verifyWebhookSignature(Buffer.from('{}'), sign(body))).toBe(
      false,
    );
    expect(service.verifyWebhookSignature(body, 'invalid')).toBe(false);
  });
  it('rejects unsigned requests when no webhook secret is configured', () => {
    delete process.env.CHAPA_WEBHOOK_SECRET;
    service = new ChapaService(
      prisma as unknown as PrismaService,
      settlement as unknown as PaymentSettlementService,
    );
    expect(service.verifyWebhookSignature('{}')).toBe(false);
  });
  it('records a reference before requesting the hosted checkout URL', async () => {
    fetchMock.mockImplementation(() => {
      expect(prisma.order.update).toHaveBeenCalled();
      return Promise.resolve(
        response({ checkout_url: 'https://checkout.chapa.co/test' }),
      );
    });
    const result = await service.initializeForOrder({
      ...order,
      contactName: 'Test User',
      contactEmail: 'test@example.com',
      contactPhone: null,
    });
    expect(result.checkoutUrl).toBe('https://checkout.chapa.co/test');
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      callback_url: string;
      currency: string;
    };
    expect(payload.callback_url).toMatch(/payments\/chapa\/callback$/);
    expect(payload.currency).toBe('ETB');
  });
});
