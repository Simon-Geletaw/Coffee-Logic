import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, type OrderStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShippingService } from 'src/shipping/shipping.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/create-order.dto';

/**
 * Everything a cart query needs in one shape. `satisfies` keeps it a literal
 * (so Prisma can infer the exact payload type) while still type-checking it.
 */
export const cartInclude = {
  items: {
    orderBy: { id: 'asc' },
    include: {
      productVariant: {
        select: {
          id: true,
          weightGrams: true,
          priceCents: true,
          currency: true,
          sku: true,
          isActive: true,
          product: {
            select: {
              id: true,
              name: true,
              origin: true,
              roastLevel: true,
              grind: true,
              imageUrl: true,
              isActive: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export type CartRecord = Prisma.OrderGetPayload<{
  include: typeof cartInclude;
}>;

/**
 * A shopper's token resolves to their order while it is in any of these
 * states. `paid` is deliberately absent: paying ends the cart's life and the
 * next visit starts a fresh one.
 */
export const VISIBLE_CART_STATUSES: OrderStatus[] = [
  'cart',
  'pending',
  'failed',
];

/** Lines can only change while nothing is holding stock for them. */
const EDITABLE_CART_STATUSES: OrderStatus[] = ['cart', 'failed'];

export const MAX_LINE_QUANTITY = 20;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: ShippingService,
  ) {}

  /* ─── Lookup ─────────────────────────────────────────────────────── */

  private newCartToken(): string {
    // 32 random bytes → 64 hex chars. Unguessable; this is the only credential.
    return randomBytes(32).toString('hex');
  }

  async findCart(cartToken: string | undefined): Promise<CartRecord | null> {
    if (!cartToken) return null;
    return this.prisma.order.findFirst({
      where: { cartToken, status: { in: VISIBLE_CART_STATUSES } },
      include: cartInclude,
    });
  }

  async requireCart(cartToken: string | undefined): Promise<CartRecord> {
    const cart = await this.findCart(cartToken);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  /**
   * Mutations are refused while a payment session is open: the reservation
   * and the provider session both describe *these* lines at *this* price.
   * A `failed` cart is editable again — editing it clears the failure.
   */
  private assertEditable(cart: CartRecord): void {
    if (!EDITABLE_CART_STATUSES.includes(cart.status)) {
      throw new ConflictException(
        'A payment is in progress for this cart. Finish or cancel it before making changes.',
      );
    }
  }

  private async clearFailure(cart: CartRecord): Promise<void> {
    if (cart.status !== 'failed') return;
    await this.prisma.order.update({
      where: { id: cart.id },
      data: { status: 'cart', failureReason: null, paymentIntentId: null },
    });
  }

  /* ─── Stock (validation only — reservation happens at checkout) ──── */

  /**
   * Units of a product available to sell right now, across its live batches.
   *
   * NOTE: Inventory is tracked per batch (so, per product) rather than per
   * variant, which means a 250 g and a 1 kg bag both draw from the same pool
   * of units. Until inventory is modelled in grams this validates unit
   * counts, not weight.
   */
  async availableUnits(productId: string): Promise<number> {
    const rows = await this.prisma.inventory.findMany({
      where: { status: true, batch: { productId, isActive: true } },
      select: { available: true },
    });
    return rows.reduce((sum, row) => sum + row.available, 0);
  }

  /**
   * Stock check across the whole cart: other lines for the same product also
   * consume units, so they count toward the limit.
   */
  private async assertStock(
    orderId: string,
    productId: string,
    variantId: string,
    nextQuantity: number,
  ): Promise<void> {
    const available = await this.availableUnits(productId);

    const siblingLines = await this.prisma.orderItem.findMany({
      where: {
        orderId,
        productVariantId: { not: variantId },
        productVariant: { productId },
      },
      select: { quantity: true },
    });
    const alreadyClaimed = siblingLines.reduce(
      (sum, line) => sum + line.quantity,
      0,
    );

    if (nextQuantity + alreadyClaimed > available) {
      const remaining = Math.max(0, available - alreadyClaimed);
      throw new BadRequestException(
        remaining === 0
          ? 'This coffee is out of stock.'
          : `Only ${remaining} left in stock.`,
      );
    }
  }

  /* ─── Totals ─────────────────────────────────────────────────────── */

  /**
   * Recompute every derived number from the lines. Runs after each mutation
   * so nothing on the order is ever taken from the client.
   *
   * Shipping that cannot be priced (no tier for this weight) is stored as 0
   * here so the cart stays usable; checkout re-quotes strictly and refuses.
   */
  async recalculate(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        currency: true,
        items: {
          select: {
            quantity: true,
            lineTotalCents: true,
            productVariant: { select: { weightGrams: true } },
          },
        },
      },
    });

    const subtotalCents = order.items.reduce(
      (sum, item) => sum + item.lineTotalCents,
      0,
    );
    const totalWeightGrams = order.items.reduce(
      (sum, item) => sum + item.quantity * item.productVariant.weightGrams,
      0,
    );

    let shippingCents = 0;
    try {
      shippingCents = (
        await this.shipping.quote(order.currency, totalWeightGrams)
      ).cents;
    } catch (error) {
      if (!(error instanceof UnprocessableEntityException)) throw error;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotalCents,
        shippingCents,
        totalWeightGrams,
        totalCents: subtotalCents + shippingCents,
      },
    });
  }

  /* ─── Serialisation ──────────────────────────────────────────────── */

  serialize(cart: CartRecord) {
    const items = cart.items.map((item) => ({
      id: item.id,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
      weightGrams: item.productVariant.weightGrams,
      sku: item.productVariant.sku,
      product: {
        id: item.productVariant.product.id,
        name: item.productVariant.product.name,
        origin: item.productVariant.product.origin,
        roastLevel: item.productVariant.product.roastLevel,
        grind: item.productVariant.product.grind,
        imageUrl: item.productVariant.product.imageUrl,
      },
    }));

    return {
      id: cart.id,
      status: cart.status,
      currency: cart.currency,
      subtotalCents: cart.subtotalCents,
      shippingCents: cart.shippingCents,
      totalCents: cart.totalCents,
      totalWeightGrams: cart.totalWeightGrams,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
      paymentProvider: cart.paymentProvider,
      paymentExpiresAt: cart.paymentExpiresAt,
      failureReason: cart.failureReason,
      updatedAt: cart.updatedAt,
    };
  }

  static emptyCart() {
    return {
      id: null,
      status: 'cart' as OrderStatus,
      currency: null,
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      totalWeightGrams: 0,
      itemCount: 0,
      items: [] as ReturnType<OrdersService['serialize']>['items'],
      paymentProvider: null,
      paymentExpiresAt: null,
      failureReason: null,
      updatedAt: null,
    };
  }

  /* ─── Public API ─────────────────────────────────────────────────── */

  async getCart(cartToken: string | undefined) {
    const cart = await this.findCart(cartToken);
    return cart ? this.serialize(cart) : OrdersService.emptyCart();
  }

  async addItem(cartToken: string | undefined, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: dto.productVariantId, isActive: true },
      select: {
        id: true,
        priceCents: true,
        currency: true,
        productId: true,
        product: { select: { isActive: true } },
      },
    });

    if (!variant || !variant.product.isActive) {
      throw new NotFoundException('Product variant is not available');
    }

    let cart = await this.findCart(cartToken);
    let token = cart?.cartToken ?? null;

    if (!cart) {
      token = this.newCartToken();
      cart = await this.prisma.order.create({
        data: { cartToken: token, status: 'cart', currency: variant.currency },
        include: cartInclude,
      });
    }

    this.assertEditable(cart);

    // One order carries one currency: Order.currency is a single column, so
    // mixing denominations would make totalCents meaningless.
    if (cart.items.length > 0 && cart.currency !== variant.currency) {
      throw new BadRequestException(
        `Your cart is in ${cart.currency}. Remove those items before adding a ${variant.currency} product.`,
      );
    }

    const existingLine = cart.items.find(
      (item) => item.productVariantId === variant.id,
    );
    const nextQuantity = (existingLine?.quantity ?? 0) + dto.quantity;

    if (nextQuantity > MAX_LINE_QUANTITY) {
      throw new BadRequestException(
        `quantity must not exceed ${MAX_LINE_QUANTITY} per item`,
      );
    }

    await this.assertStock(
      cart.id,
      variant.productId,
      variant.id,
      nextQuantity,
    );
    await this.clearFailure(cart);

    const lineData = {
      quantity: nextQuantity,
      unitPriceCents: variant.priceCents,
      lineTotalCents: variant.priceCents * nextQuantity,
    };

    if (existingLine) {
      await this.prisma.orderItem.update({
        where: { id: existingLine.id },
        data: lineData,
      });
    } else {
      await this.prisma.orderItem.create({
        data: { ...lineData, orderId: cart.id, productVariantId: variant.id },
      });
      // The first item on a fresh cart fixes the order currency.
      if (cart.currency !== variant.currency) {
        await this.prisma.order.update({
          where: { id: cart.id },
          data: { currency: variant.currency },
        });
      }
    }

    await this.recalculate(cart.id);
    const refreshed = await this.requireCart(token ?? undefined);
    return { cartToken: token as string, cart: this.serialize(refreshed) };
  }

  async updateItem(
    cartToken: string | undefined,
    itemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cart = await this.requireCart(cartToken);
    this.assertEditable(cart);

    const line = cart.items.find((item) => item.id === itemId);
    if (!line) {
      throw new NotFoundException('Cart item not found');
    }

    // Setting a line to zero is the same gesture as removing it.
    if (dto.quantity === 0) {
      return this.removeItem(cartToken, itemId);
    }

    const variant = line.productVariant;
    if (!variant.isActive || !variant.product.isActive) {
      throw new BadRequestException(
        `${variant.product.name} is no longer available.`,
      );
    }

    await this.assertStock(
      cart.id,
      variant.product.id,
      variant.id,
      dto.quantity,
    );
    await this.clearFailure(cart);

    await this.prisma.orderItem.update({
      where: { id: line.id },
      data: {
        quantity: dto.quantity,
        unitPriceCents: variant.priceCents,
        lineTotalCents: variant.priceCents * dto.quantity,
      },
    });

    await this.recalculate(cart.id);
    return this.serialize(await this.requireCart(cartToken));
  }

  async removeItem(cartToken: string | undefined, itemId: string) {
    const cart = await this.requireCart(cartToken);
    this.assertEditable(cart);

    const line = cart.items.find((item) => item.id === itemId);
    if (!line) {
      throw new NotFoundException('Cart item not found');
    }

    await this.clearFailure(cart);
    await this.prisma.orderItem.delete({ where: { id: line.id } });
    await this.recalculate(cart.id);
    return this.serialize(await this.requireCart(cartToken));
  }

  async clearCart(cartToken: string | undefined) {
    const cart = await this.requireCart(cartToken);
    this.assertEditable(cart);

    await this.clearFailure(cart);
    await this.prisma.orderItem.deleteMany({ where: { orderId: cart.id } });
    await this.recalculate(cart.id);
    return this.serialize(await this.requireCart(cartToken));
  }

  /** Read back a placed order — the confirmation screen. */
  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: cartInclude,
    });

    if (!order || order.status === 'cart') {
      throw new NotFoundException('Order not found');
    }

    return {
      ...this.serialize(order),
      contactName: order.contactName,
      contactEmail: order.contactEmail,
      shippingAddress: order.shippingAddress,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
    };
  }
}
