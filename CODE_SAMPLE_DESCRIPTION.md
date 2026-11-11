# Code Sample (MLH Fellowship) — Payment Settlement & Idempotent Inventory Deduction

## Chosen part of the codebase
**Primary file:** `apps/api/src/payments/payment-settlement.service.ts`  
**Related files:** `apps/api/src/payments/payment-settlement.service.spec.ts`, `apps/api/src/payments/stripe.service.ts`, `apps/api/src/inventory/inventory.service.ts`, `prisma/schema.prisma`

I chose this small, focused module because it sits at a critical boundary in the system (payment confirmation → order fulfillment) and demonstrates correctness, data integrity, and real-world backend problem solving in a compact piece of TypeScript/NestJS code.

## Briefly describe what this code sample does
Coffee Logic is a full-stack coffee e-commerce app (pnpm monorepo) with a **Next.js + TypeScript** web app (`apps/web`) and a **NestJS + Prisma/PostgreSQL** API (`apps/api`). It supports products/variants, batch-based inventory, carts/checkout, and payments (e.g. Stripe/Chapa).

The selected code, `PaymentSettlementService.markPaid(orderId)`, finalizes a paid checkout: it marks an order as paid and deducts inventory **exactly once**, even if the same payment confirmation arrives multiple times (for example, a webhook retry and a return-page verification running concurrently).

What the service does:
- **Runs atomically in a Prisma `$transaction`** so order status changes and stock deductions stay consistent.
- **Implements idempotency with a conditional claim:** it updates the order to `paid` only when its status is `pending` or `failed` (`updateMany`). If no row is claimed, the order was already settled and the method returns without touching inventory (preventing double-deduction).
- **Loads order items and allocates stock per product across active batches:** it finds active inventory for active batches of the ordered product and drains availability in a deterministic order.
- **Performs concurrency-safe, guarded decrements:** each inventory update uses `updateMany` with conditions (`status: true`, `available >= take`, `onHand >= take`) and `decrement`, so concurrent operations cannot push stock negative or over-consume.
- **Fails safely on insufficient stock:** if the full quantity cannot be allocated, it throws a `ServiceUnavailableException`, causing the transaction to roll back (avoiding a partially-paid/partially-deducted state) so the case can be reconciled and retried.

## Core code excerpt

```ts
async markPaid(orderId: string): Promise<void> {
  // Conditional update + transaction: webhook retries and return-page
  // verification cannot debit stock twice, even when they arrive together.
  await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        // Roll back paid state and stock changes for reconciliation/retry.
        throw new ServiceUnavailableException(
          'Payment received; order stock needs reconciliation.',
        );
      }
    }
  });
}
```

## Supporting evidence
`payment-settlement.service.spec.ts` verifies key behaviors: draining stock across multiple batches with guarded decrements, skipping deductions for already-settled orders, and rejecting/rolling back when inventory cannot be fully allocated.
