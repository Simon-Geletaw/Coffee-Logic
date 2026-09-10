import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from 'src/products/dto/create-product.dto';

type productAttribute = {
  roastLevel?: string;
  grind?: string;
  origin?: string;
  caffeine?: string;
  name?: string;
  process?: string;
  description?: string;
  imageUrl?: string;
};

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async getProducts(filter: productAttribute = {}) {
    const products = await this.prisma.product.findMany({
      where: {
        ...(filter.roastLevel ? { roastLevel: filter.roastLevel } : {}),
        ...(filter.grind ? { grind: filter.grind } : {}),
        ...(filter.name
          ? {
              name: {
                contains: filter.name,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(filter.origin ? { origin: filter.origin } : {}),
        ...(filter.process ? { process: filter.process } : {}),
        ...(filter.caffeine ? { caffeine: filter.caffeine } : {}),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        roastLevel: true,
        grind: true,
        origin: true,
        process: true,
        caffeine: true,
        imageUrl: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return products.map((product: (typeof products)[number]) => ({
      id: product.id,
      name: product.name,
      roastLevel: product.roastLevel,
      grind: product.grind,
      origin: product.origin,
      process: product.process,
      caffeine: product.caffeine,
      imageUrl: product.imageUrl,
    }));
  }
  async createProduct(product: CreateProductDto) {
    if (!product.name) {
      throw new PreconditionFailedException('Product name is required');
    }
    const newProduct = await this.prisma.product.create({
      data: {
        name: product.name ?? '',
        roastLevel: product.roastLevel ?? '',
        grind: product.grind ?? '',
        origin: product.origin ?? '',
        process: product.process ?? '',
        caffeine: product.caffeine ?? '',
        description: product.description ?? '',
        imageUrl: product.imageUrl ?? null,
        isActive: true,
      },
    });
    return newProduct;
  }

  async createProducts(products: CreateProductDto[]) {
    if (!Array.isArray(products) || products.length === 0) {
      throw new BadRequestException(
        'Products payload must be a non-empty array',
      );
    }

    const createdProducts: Array<
      Awaited<ReturnType<typeof this.prisma.product.create>>
    > = [];
    for (const product of products) {
      if (!product.name) {
        throw new PreconditionFailedException('Each product requires a name');
      }
      const created = await this.prisma.product.create({
        data: {
          name: product.name,
          roastLevel: product.roastLevel ?? '',
          grind: product.grind ?? '',
          origin: product.origin ?? '',
          process: product.process ?? '',
          caffeine: product.caffeine ?? '',
          description: product.description ?? '',
          imageUrl: product.imageUrl ?? null,
          isActive: true,
        },
      });
      createdProducts.push(created);
    }

    return {
      status: 201,
      count: createdProducts.length,
      products: createdProducts,
    };
  }

  async updateProduct(id: string, updatesProduct: productAttribute = {}) {
    if (!id) {
      throw new BadRequestException('Product id is required');
    }

    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        roastLevel: true,
        grind: true,
        origin: true,
        process: true,
        caffeine: true,
        imageUrl: true,
      },
    });
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }
    const updatedProduct = await this.prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        name: updatesProduct?.name ?? existingProduct.name,
        roastLevel: updatesProduct?.roastLevel ?? existingProduct.roastLevel,
        grind: updatesProduct?.grind ?? existingProduct.grind,
        origin: updatesProduct?.origin ?? existingProduct.origin,
        process: updatesProduct?.process ?? existingProduct.process,
        caffeine: updatesProduct?.caffeine ?? existingProduct.caffeine,
        description: updatesProduct?.description ?? existingProduct.description,
        imageUrl: updatesProduct?.imageUrl ?? existingProduct.imageUrl,
      },
    });
    return updatedProduct;
  }
  async deleteProduct(id: string) {
    if (!id) {
      throw new BadRequestException('Product id is required');
    }
    const findtobeDeletedProduct = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });
    if (!findtobeDeletedProduct) {
      throw new NotFoundException('Product not found');
    }
    const DeletedProduct = await this.prisma.product.update({
      where: { id: findtobeDeletedProduct.id },
      data: { isActive: false },
    });
    if (!DeletedProduct) {
      throw new InternalServerErrorException('Failed to delete product');
    }
    if (!DeletedProduct.isActive) {
      return {
        id: DeletedProduct.id,
        name: DeletedProduct.name,
        status: 'deleted' as const,
      };
    }
  }
}
