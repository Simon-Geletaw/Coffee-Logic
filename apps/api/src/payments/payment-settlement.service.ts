import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type CheckoutOrder = {
  id: string;
  totalCents: number;
  currency: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export type PaymentResult = {
  orderId: string | null;
  status: 'paid' | 'pending' | 'failed' | 'unknown';
};

@Injectable()
export class PaymentSettlementService {
  constructor(private readonly prisma: PrismaService) {}

  async markPaid(orderId: string): Promise<void> {
    // The conditional update locks the order. Webhook retries and return-page
    // verification cannot debit stock twice, even when they arrive together.
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: { in: ['pending', 'failed'] } },
        data: { status: 'paid', paideAt: new Date(), cartToken: null },
      });
      if (!claimed.count) return;

      const items = await tx.orderItem.findMany({
        where: { orderId },
        orderBy: { productVariantId: 'asc' },
        select: {
          quantity: true,
          productVariant: { select: { productId: true } },
        },
      });
      for (const item of items) {
        let remaining = item.quantity;
        const inventories = await tx.inventory.findMany({
          where: {
            status: true,
            available: { gt: 0 },
            batch: { isActive: true, productId: item.productVariant.productId },
          },
          orderBy: [{ batch: { roastDate: 'desc' } }, { id: 'asc' }],
          select: { id: true, available: true },
        });
        for (const inventory of inventories) {
          if (remaining === 0) break;
          const take = Math.min(inventory.available, remaining);
          const updated = await tx.inventory.updateMany({
            where: {
              id: inventory.id,
              status: true,
              available: { gte: take },
              onHand: { gte: take },
            },
            data: {
              available: { decrement: take },
              onHand: { decrement: take },
            },
          });
          if (updated.count) remaining -= take;
        }
        if (remaining > 0) {
          // Roll back both the paid state and all stock changes; a subsequent
          // verified callback can retry after stock has been reconciled.
          throw new ServiceUnavailableException(
            'Payment received; order stock needs reconciliation.',
          );
        }
      }
    });
  }
}
