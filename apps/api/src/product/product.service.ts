import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type ProductFilter = {
    roastLevel?: string;
    grind?: string;
    origin?: string;
    caffeine?: string;
    name?: string;
    process?: string;
};

@Injectable()
export class ProductService {
    constructor(private readonly prisma: PrismaService) {}

    async getProducts(filter: ProductFilter = {}) {
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
}
