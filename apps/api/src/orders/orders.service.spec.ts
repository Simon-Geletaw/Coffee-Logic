import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from '../payments/chapa.service';
import { StripeService } from '../payments/stripe.service';

describe('checkout handoff', () => {
  const item = {
    id: 'line',
    quantity: 1,
    unitPriceCents: 12000,
    lineTotalCents: 12000,
    productVariantId: 'variant',
    productVariant: {
      id: 'variant',
      isActive: true,
      priceCents: 12000,
      product: { id: 'product', name: 'Coffee', isActive: true },
    },
  };
  const cart = {
    id: 'order',
    cartToken: 'token',
    status: 'cart',
    totalCents: 12000,
    currency: 'ETB',
    items: [item],
  };
  const prisma = {
    order: { findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    orderItem: { findMany: jest.fn() },
    inventory: { findMany: jest.fn() },
  };
  const chapa = { isConfigured: true, initializeForOrder: jest.fn() };
  const stripe = { isConfigured: true, initializeForOrder: jest.fn() };
  const service = new OrdersService(
    prisma as unknown as PrismaService,
    chapa as unknown as ChapaService,
    stripe as unknown as StripeService,
  );
  const dto = {
    contactName: 'Test User',
    contactEmail: 'test@example.com',
    shippingAddress: 'Addis Ababa',
    paymentProvider: 'chapa' as 'chapa' | 'stripe',
  };
  beforeEach(() => {
    jest.clearAllMocks();
    chapa.isConfigured = stripe.isConfigured = true;
    prisma.order.findFirst.mockResolvedValue(cart);
    prisma.order.update.mockImplementation((args: { data: object }) =>
      Promise.resolve({ ...cart, ...args.data }),
    );
    prisma.orderItem.findMany.mockResolvedValue([
      { quantity: 0, lineTotalCents: 12000 },
    ]);
    prisma.inventory.findMany.mockResolvedValue([{ available: 10 }]);
    chapa.initializeForOrder.mockResolvedValue({
      checkoutUrl: 'https://checkout.chapa.co/test',
    });
    stripe.initializeForOrder.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/test',
    });
  });
  it.each(['chapa', 'stripe'] as const)(
    'returns the %s hosted checkout URL and then releases the cart',
    async (paymentProvider) => {
      const provider = paymentProvider === 'chapa' ? chapa : stripe;
      const result = await service.checkout('token', {
        ...dto,
        paymentProvider,
      });
      expect(result.checkoutUrl).toContain(paymentProvider);
      expect(provider.initializeForOrder).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', cartToken: 'token' }),
        undefined,
      );
      expect(prisma.order.update).toHaveBeenLastCalledWith({
        where: { id: 'order' },
        data: { cartToken: null },
      });
    },
  );
  it('rejects unavailable providers before changing the cart', async () => {
    stripe.isConfigured = false;
    await expect(
      service.checkout('token', { ...dto, paymentProvider: 'stripe' }),
    ).rejects.toThrow('not configured');
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
  it('restores the cart when payment initialization fails', async () => {
    chapa.initializeForOrder.mockRejectedValueOnce(
      new Error('Provider unavailable'),
    );
    await expect(service.checkout('token', dto)).rejects.toThrow(
      'Provider unavailable',
    );
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order', status: 'pending' },
      data: { status: 'cart', paymentProvider: null, paymentIntentId: null },
    });
    expect(prisma.order.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { cartToken: null } }),
    );
  });
  it('rejects a deleted product even if its variant remains active', async () => {
    prisma.order.findFirst.mockResolvedValueOnce({
      ...cart,
      items: [
        {
          ...item,
          productVariant: {
            ...item.productVariant,
            product: { ...item.productVariant.product, isActive: false },
          },
        },
      ],
    });
    await expect(service.checkout('token', dto)).rejects.toThrow(
      'no longer available',
    );
    expect(chapa.initializeForOrder).not.toHaveBeenCalled();
  });
});
