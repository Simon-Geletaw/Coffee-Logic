import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CatalogCacheService } from './catalog-cache.service';

/** Narrow an arbitrary query string to the Currency enum, or drop it. */
function toCurrency(value: string | undefined): Currency | undefined {
  return value && (Object.values(Currency) as string[]).includes(value)
    ? (value as Currency)
    : undefined;
}

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CatalogCacheService,
  ) {}

  /**
   * Storefront product listing. Only active products with at least one active
   * variant are returned — a product with no purchasable variant has no price
   * to show, so it would render as a dead card in the shop grid.
   */
  listProducts(filter: CatalogFilter = {}) {
    return this.cache.getOrSet(
      CatalogCacheService.keyFor('list', {
        ...filter,
        currency: toCurrency(filter.currency),
      }),
      () => this.loadProducts(filter),
    );
  }

  private async loadProducts(filter: CatalogFilter) {
    const currency = toCurrency(filter.currency);
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
    const product = await this.cache.getOrSet(
      CatalogCacheService.keyFor('product', { id }),
      () => this.loadProduct(id),
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private loadProduct(id: string) {
    return this.prisma.product.findFirst({
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
  }

  /**
   * Distinct values for each filterable attribute, so the shop filter bar is
   * driven by what is actually in the catalogue rather than a hardcoded list.
   */
  getFacets() {
    return this.cache.getOrSet(CatalogCacheService.keyFor('facets'), () =>
      this.loadFacets(),
    );
  }

  private async loadFacets() {
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
