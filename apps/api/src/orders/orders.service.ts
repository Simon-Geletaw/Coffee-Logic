import {
  BadRequestException,
  ServiceUnavailableException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from '../payments/chapa.service';
import { StripeService } from '../payments/stripe.service';
import {
  AddCartItemDto,
  CheckoutDto,
  UpdateCartItemDto,
} from './dto/create-order.dto';
import { BadRequestException as InvalidQueryException } from '@nestjs/common';

const cartInclude = {
  items: {
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
              isActive: true,
              name: true,
              origin: true,
              roastLevel: true,
              grind: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  },
} as const;

type CartItemRecord = {
  id: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  productVariantId: string;
  productVariant: {
    id: string;
    weightGrams: number;
    priceCents: number;
    currency: string;
    sku: string | null;
    isActive: boolean;
    product: {
      id: string;
      isActive: boolean;
      name: string;
      origin: string;
      roastLevel: string;
      grind: string;
      imageUrl: string | null;
    };
  };
};

type CartRecord = {
  id: string;
  cartToken: string | null;
  status: string;
  currency: string;
  totalCents: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  shippingAddress: string | null;
  paymentProvider: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemRecord[];
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chapa: ChapaService,
    private readonly stripe: StripeService,
  ) {}

  private newCartToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async findCart(cartToken: string | undefined) {
    if (!cartToken) return null;
    const cart = await this.prisma.order.findFirst({
      where: { cartToken, status: 'cart' },
      include: cartInclude,
    });
    return cart as CartRecord | null;
  }

  private async requireCart(cartToken: string | undefined) {
    const cart = await this.findCart(cartToken);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  /**
   * Units of a product available to sell right now: the sum of available
   * inventory across its live batches.
   *
   * NOTE: Inventory is tracked per batch (so, per product) rather than per
   * variant, which means a 250g and a 1kg bag both draw from the same pool of
   * units. Until inventory is modelled in grams this validates unit counts,
   * not weight.
   */
  private async availableUnits(productId: string): Promise<number> {
    const rows = await this.prisma.inventory.findMany({
      where: {
        status: true,
        batch: { productId, isActive: true },
      },
      select: { available: true },
    });
    return rows.reduce(
      (sum: number, row: { available: number }) => sum + row.available,
      0,
    );
  }

  private serialize(cart: CartRecord) {
    const items = cart.items.map((item) => ({
      id: item.id,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
      weightGrams: item.productVariant.weightGrams,
      sku: item.productVariant.sku,
      product: item.productVariant.product,
    }));

    return {
      id: cart.id,
      status: cart.status,
      currency: cart.currency,
      totalCents: cart.totalCents,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Recompute the order total from its lines. Run after every mutation so
   * totalCents is never taken from the client.
   */
  private async recalculate(orderId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      select: { lineTotalCents: true },
    });
    const totalCents = items.reduce(
      (sum: number, item: { lineTotalCents: number }) =>
        sum + item.lineTotalCents,
      0,
    );

    await this.prisma.order.update({
      where: { id: orderId },
      data: { totalCents },
    });
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
  ) {
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
      (sum: number, line: { quantity: number }) => sum + line.quantity,
      0,
    );

    if (nextQuantity + alreadyClaimed > available) {
      const remaining = Math.max(0, available - alreadyClaimed);
      throw new BadRequestException(
        remaining === 0
          ? 'This coffee is out of stock.'
          : 'Only ' + remaining + ' left in stock.',
      );
    }
  }

  async getCart(cartToken: string | undefined) {
    const cart = await this.findCart(cartToken);
    if (!cart) {
      return {
        id: null,
        status: 'cart',
        currency: null,
        totalCents: 0,
        itemCount: 0,
        items: [],
        updatedAt: null,
      };
    }
    return this.serialize(cart);
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
      const created = await this.prisma.order.create({
        data: {
          cartToken: token,
          status: 'cart',
          totalCents: 0,
          currency: variant.currency,
        },
        include: cartInclude,
      });
      cart = created as CartRecord;
    }

    // One order carries one currency: Order.currency is a single column, so
    // mixing denominations would make totalCents meaningless.
    if (cart.items.length > 0 && cart.currency !== variant.currency) {
      throw new BadRequestException(
        'Your cart is in ' +
          cart.currency +
          '. Remove those items before adding a ' +
          variant.currency +
          ' product.',
      );
    }

    const existingLine = cart.items.find(
      (item) => item.productVariantId === variant.id,
    );
    const nextQuantity = (existingLine?.quantity ?? 0) + dto.quantity;

    if (nextQuantity > 20) {
      throw new BadRequestException('quantity must not exceed 20 per item');
    }

    await this.assertStock(
      cart.id,
      variant.productId,
      variant.id,
      nextQuantity,
    );

    if (existingLine) {
      await this.prisma.orderItem.update({
        where: { id: existingLine.id },
        data: {
          quantity: nextQuantity,
          unitPriceCents: variant.priceCents,
          lineTotalCents: variant.priceCents * nextQuantity,
        },
      });
    } else {
      await this.prisma.orderItem.create({
        data: {
          orderId: cart.id,
          productVariantId: variant.id,
          quantity: nextQuantity,
          unitPriceCents: variant.priceCents,
          lineTotalCents: variant.priceCents * nextQuantity,
        },
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
    const line = cart.items.find((item) => item.id === itemId);
    if (!line) {
      throw new NotFoundException('Cart item not found');
    }

    // Setting a line to zero is the same gesture as removing it.
    if (dto.quantity === 0) {
      return this.removeItem(cartToken, itemId);
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: line.productVariantId },
      select: { id: true, priceCents: true, productId: true },
    });
    if (!variant) {
      throw new NotFoundException('Product variant is not available');
    }

    await this.assertStock(
      cart.id,
      variant.productId,
      variant.id,
      dto.quantity,
    );

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
    const line = cart.items.find((item) => item.id === itemId);
    if (!line) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.orderItem.delete({ where: { id: line.id } });
    await this.recalculate(cart.id);
    return this.serialize(await this.requireCart(cartToken));
  }

  async clearCart(cartToken: string | undefined) {
    const cart = await this.requireCart(cartToken);
    await this.prisma.orderItem.deleteMany({ where: { orderId: cart.id } });
    await this.recalculate(cart.id);
    return this.serialize(await this.requireCart(cartToken));
  }

  /**
   * Turn the cart into a real order. Prices are re-read from the variants at
   * this moment so a stale cart cannot lock in an old price, and stock is
   * re-checked because nothing was reserved while the cart sat idle.
   */
  async checkout(cartToken: string | undefined, dto: CheckoutDto) {
    const provider =
      dto.paymentProvider === 'stripe' ? this.stripe : this.chapa;
    if (!provider.isConfigured) {
      throw new ServiceUnavailableException(
        'Selected payment provider is not configured. Please choose another payment method.',
      );
    }
    const cart = await this.requireCart(cartToken);

    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty.');
    }

    for (const item of cart.items) {
      if (
        !item.productVariant.isActive ||
        !item.productVariant.product.isActive
      ) {
        throw new BadRequestException(
          item.productVariant.product.name + ' is no longer available.',
        );
      }
      await this.assertStock(
        cart.id,
        item.productVariant.product.id,
        item.productVariant.id,
        item.quantity,
      );
      if (item.unitPriceCents !== item.productVariant.priceCents) {
        await this.prisma.orderItem.update({
          where: { id: item.id },
          data: {
            unitPriceCents: item.productVariant.priceCents,
            lineTotalCents: item.productVariant.priceCents * item.quantity,
          },
        });
      }
    }

    await this.recalculate(cart.id);

    const placed = (await this.prisma.order.update({
      where: { id: cart.id, status: 'cart' },
      data: {
        status: 'pending',
        paymentProvider: dto.paymentProvider,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone ?? null,
        shippingAddress: dto.shippingAddress,
        // Keep the token until the provider returns a usable payment URL.
        cartToken,
      },
      include: cartInclude,
    })) as CartRecord;

    let checkoutUrl: string;
    try {
      checkoutUrl = (await provider.initializeForOrder(placed)).checkoutUrl;
    } catch (error) {
      // A failed initialization must leave the cart available for retry.
      // Never overwrite a payment that a concurrent callback has confirmed.
      await this.prisma.order.updateMany({
        where: { id: placed.id, status: 'pending' },
        data: { status: 'cart', paymentProvider: null, paymentIntentId: null },
      });
      throw error;
    }
    await this.prisma.order.update({
      where: { id: placed.id },
      data: { cartToken: null },
    });
    return {
      orderId: placed.id,
      status: placed.status,
      totalCents: placed.totalCents,
      currency: placed.currency,
      paymentProvider: placed.paymentProvider,
      itemCount: placed.items.reduce((sum, item) => sum + item.quantity, 0),
      checkoutUrl,
    };
  }

  /** Read back a placed order, for the confirmation screen. */
  async getOrder(id: string) {
    const order = (await this.prisma.order.findUnique({
      where: { id },
      include: cartInclude,
    })) as CartRecord | null;

    if (!order || order.status === 'cart') {
      throw new NotFoundException('Order not found');
    }

    return {
      ...this.serialize(order),
      contactName: order.contactName,
      contactEmail: order.contactEmail,
      shippingAddress: order.shippingAddress,
      paymentProvider: order.paymentProvider,
      createdAt: order.createdAt,
    };
  }

  async getAdminOrders(status?: string, paymentProvider?: string) {
    const allowedStatuses = ['cart', 'pending', 'paid', 'failed', 'refunded'];
    const allowedProviders = ['chapa', 'stripe'];

    if (status && !allowedStatuses.includes(status)) {
      throw new InvalidQueryException('Invalid order status');
    }
    if (paymentProvider && !allowedProviders.includes(paymentProvider)) {
      throw new InvalidQueryException('Invalid payment provider');
    }

    return this.prisma.order.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(paymentProvider ? { paymentProvider } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        status: true,
        totalCents: true,
        currency: true,
        paymentProvider: true,
        paymentIntentId: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        shippingAddress: true,
        createdAt: true,
        updatedAt: true,
        paideAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPriceCents: true,
            lineTotalCents: true,
            productVariant: {
              select: {
                id: true,
                sku: true,
                weightGrams: true,
                product: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async getAdminOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalCents: true,
        currency: true,
        paymentProvider: true,
        paymentIntentId: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        shippingAddress: true,
        createdAt: true,
        updatedAt: true,
        paideAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPriceCents: true,
            lineTotalCents: true,
            productVariant: {
              select: {
                id: true,
                sku: true,
                weightGrams: true,
                product: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
