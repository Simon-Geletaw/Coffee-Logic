import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CatalogCacheService } from 'src/catalog/catalog-cache.service';

const variantSelect = {
  id: true,
  productId: true,
  weightGrams: true,
  priceCents: true,
  currency: true,
  sku: true,
  isActive: true,
  product: { select: { id: true, name: true } },
} as const;

@Injectable()
export class VariantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CatalogCacheService,
  ) {}

  findAll(productId?: string) {
    return this.prisma.productVariant.findMany({
      where: productId ? { productId } : {},
      select: variantSelect,
      orderBy: [{ productId: 'asc' }, { weightGrams: 'asc' }],
    });
  }

  async create(dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const duplicate = await this.prisma.productVariant.findFirst({
      where: {
        productId: dto.productId,
        weightGrams: dto.weightGrams,
        currency: dto.currency ?? 'ETB',
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException(
        'A variant with this weight and currency already exists for the product',
      );
    }

    const created = await this.prisma.productVariant.create({
      data: {
        productId: dto.productId,
        weightGrams: dto.weightGrams,
        priceCents: dto.priceCents,
        currency: dto.currency ?? 'ETB',
        sku: dto.sku ?? null,
        isActive: dto.isActive ?? true,
      },
      select: variantSelect,
    });
    await this.cache.invalidate();
    return created;
  }

  async update(id: string, dto: UpdateVariantDto) {
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Variant not found');
    }

    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: {
        ...(dto.weightGrams === undefined
          ? {}
          : { weightGrams: dto.weightGrams }),
        ...(dto.priceCents === undefined ? {} : { priceCents: dto.priceCents }),
        ...(dto.currency === undefined ? {} : { currency: dto.currency }),
        ...(dto.sku === undefined ? {} : { sku: dto.sku }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
      },
      select: variantSelect,
    });
    await this.cache.invalidate();
    return updated;
  }

  /**
   * Soft delete. Variants are referenced by historical OrderItems, so the row
   * must survive — deactivating simply removes it from the storefront.
   */
  async softDelete(id: string) {
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Variant not found');
    }

    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: { isActive: false },
      select: variantSelect,
    });

    await this.cache.invalidate();
    return { id: updated.id, status: 'deleted' as const };
  }
}
