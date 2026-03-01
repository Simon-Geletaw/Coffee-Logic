import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type productAttribute = {
    roastLevel?: string;
    grind?: string;
    origin?: string;
    caffeine?: string;
    name?: string;
    process?: string;
    description?: string;
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
            },
            orderBy: {
                name: 'asc',
            },
        });

        return products.map((product) => ({
            id: product.id,
            name: product.name,
            roast: product.roastLevel,
            grind: product.grind,
            origin: product.origin,
            process: product.process,
            caffeine: product.caffeine,
        }));
    }
    async createProduct(product: productAttribute) {
        if (!product.name) {
            throw new (await import('@nestjs/common')).PreconditionFailedException('Product name is required');
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
                isActive: true,
            },  
    
    });     
    return newProduct;
    }
}
