import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Currency } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateShippingRateDto,
  UpdateShippingRateDto,
} from './dto/shipping-rate.dto';

export type ShippingQuote = {
  cents: number;
  label: string;
};

/**
 * Weight-tier shipping.
 *
 * Tiers live in the ShippingRate table so the business can change them
 * without a deploy. A cart of W grams in currency C pays the cheapest active
 * tier for C whose ceiling (maxGrams) is >= W. The seed's top tier uses a
 * sentinel ceiling of 1,000,000 g so a match always exists for sane carts.
 */
@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(
    currency: Currency,
    totalWeightGrams: number,
  ): Promise<ShippingQuote> {
    // An empty cart ships nothing; short-circuit before touching the DB.
    if (totalWeightGrams <= 0) {
      return { cents: 0, label: 'No shipping' };
    }

    // Ascending ceiling → the first match is the tightest (and cheapest) tier.
    const tier = await this.prisma.shippingRate.findFirst({
      where: {
        currency,
        isActive: true,
        maxGrams: { gte: totalWeightGrams },
      },
      orderBy: { maxGrams: 'asc' },
      select: { cents: true, label: true },
    });

    if (!tier) {
      // 422, not 400: the request is well-formed, the business simply has no
      // rate for this weight. The admin needs to add a tier.
      throw new UnprocessableEntityException(
        `No shipping rate configured for ${totalWeightGrams} g in ${currency}.`,
      );
    }

    return tier;
  }

  /* ─── Admin CRUD ─────────────────────────────────────────────────── */

  findAll() {
    return this.prisma.shippingRate.findMany({
      orderBy: [{ currency: 'asc' }, { maxGrams: 'asc' }],
    });
  }

  create(dto: CreateShippingRateDto) {
    return this.prisma.shippingRate.create({ data: dto });
  }

  async update(id: string, dto: UpdateShippingRateDto) {
    await this.requireRate(id);
    return this.prisma.shippingRate.update({ where: { id }, data: dto });
  }

  /** Soft delete: historical orders were priced by this tier, keep the row. */
  async deactivate(id: string) {
    await this.requireRate(id);
    return this.prisma.shippingRate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async requireRate(id: string) {
    const rate = await this.prisma.shippingRate.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!rate) {
      throw new NotFoundException('Shipping rate not found');
    }
    return rate;
  }
}
