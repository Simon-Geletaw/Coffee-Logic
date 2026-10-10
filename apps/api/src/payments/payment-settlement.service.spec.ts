import { PaymentSettlementService } from './payment-settlement.service';
import { PrismaService } from '../prisma/prisma.service';

describe('payment settlement', () => {
  const tx = {
    order: { updateMany: jest.fn() },
    orderItem: { findMany: jest.fn() },
    inventory: { findMany: jest.fn(), updateMany: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((work: (client: typeof tx) => Promise<void>) =>
      work(tx),
    ),
  };
  const service = new PaymentSettlementService(
    prisma as unknown as PrismaService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.orderItem.findMany.mockResolvedValue([
      { quantity: 3, productVariant: { productId: 'product' } },
    ]);
    tx.inventory.findMany.mockResolvedValue([
      { id: 'batch1', available: 2 },
      { id: 'batch2', available: 4 },
    ]);
    tx.inventory.updateMany.mockResolvedValue({ count: 1 });
  });
  it('drains multiple batches with atomic, guarded decrements', async () => {
    await service.markPaid('order');
    expect(tx.inventory.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'batch1',
        status: true,
        available: { gte: 2 },
        onHand: { gte: 2 },
      },
      data: { available: { decrement: 2 }, onHand: { decrement: 2 } },
    });
    expect(tx.inventory.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: { available: { decrement: 1 }, onHand: { decrement: 1 } },
      }),
    );
  });
  it('does not deduct stock for an already-settled order', async () => {
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    await service.markPaid('order');
    expect(tx.inventory.updateMany).not.toHaveBeenCalled();
  });
  it('rejects the transaction instead of partially marking an order paid', async () => {
    tx.inventory.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.markPaid('order')).rejects.toThrow('reconciliation');
  });
});
