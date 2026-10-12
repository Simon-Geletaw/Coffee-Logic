import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CatalogFilter = {
  roastLevel?: string;
  grind?: string;
  origin?: string;
  caffeine?: string;
  process?: string;
  name?: string;
  currency?: string;
};

const variantSelect = {
  id: true,
  weightGrams: true,
  priceCents: true,
  currency: true,
  sku: true,
} as const;

const productSelect = {
  id: true,
  name: true,
  description: true,
  roastLevel: true,
  grind: true,
  origin: true,
  process: true,
  caffeine: true,
  imageUrl: true,
  sensoryProfile: true,
} as const;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Storefront product listing. Only active products with at least one active
   * variant are returned — a product with no purchasable variant has no price
   * to show, so it would render as a dead card in the shop grid.
   */
  async listProducts(filter: CatalogFilter = {}) {
    // `currency` arrives as a raw query string. ProductVariant.currency is
    // stored as a string, so only accept the currencies supported by checkout.
    const currency =
      filter.currency === 'ETB' || filter.currency === 'USD'
        ? filter.currency
        : undefined;

    const variantWhere = {
      isActive: true,
      ...(currency ? { currency } : {}),
    };

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(filter.roastLevel ? { roastLevel: filter.roastLevel } : {}),
        ...(filter.grind ? { grind: filter.grind } : {}),
        ...(filter.origin ? { origin: filter.origin } : {}),
        ...(filter.process ? { process: filter.process } : {}),
        ...(filter.caffeine ? { caffeine: filter.caffeine } : {}),
        ...(filter.name
          ? { name: { contains: filter.name, mode: 'insensitive' as const } }
          : {}),
        variants: { some: variantWhere },
      },
      select: {
        ...productSelect,
        variants: {
          where: variantWhere,
          select: variantSelect,
          orderBy: { weightGrams: 'asc' as const },
        },
      },
      orderBy: { name: 'asc' as const },
    });

    return products;
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true },
      select: {
        ...productSelect,
        variants: {
          where: { isActive: true },
          select: variantSelect,
          orderBy: { weightGrams: 'asc' as const },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  /**
   * Distinct values for each filterable attribute, so the shop filter bar is
   * driven by what is actually in the catalogue rather than a hardcoded list.
   */
  async getFacets() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, variants: { some: { isActive: true } } },
      select: {
        roastLevel: true,
        grind: true,
        origin: true,
        process: true,
        caffeine: true,
      },
    });

    const collect = (key: keyof (typeof products)[number]) =>
      Array.from(
        new Set(
          products
            .map((product: (typeof products)[number]) => product[key])
            .filter((value: unknown): value is string => Boolean(value)),
        ),
      ).sort();

    return {
      roastLevel: collect('roastLevel'),
      grind: collect('grind'),
      origin: collect('origin'),
      process: collect('process'),
      caffeine: collect('caffeine'),
    };
  }
}
