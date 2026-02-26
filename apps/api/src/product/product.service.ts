import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
type ProductFilter = {
roastLevel?: string;
grind?: string;
origin?: string;
caffeine?:String;
name?: string;
process?: string;
};

@Injectable()
export class ProductService {
    constructor(private readonly prisma: PrismaService) {}

    async getProducts(filter: ProductFilter={}) {
        return (await this.prisma.product.findMany({
            where: {
                ...(filter.roastLevel?{roast: filter.roastLevel}:{}),
                ...(filter.grind?{grind: filter.grind}:{}),
                ...(filter.name?{name: filter.name}:{}),
                ...(filter.origin?{origin: filter.origin}:{}),
                ...(filter.process?{process: filter.process}:{}),
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                roastLevel: true,
                grind: true,
                origin: true,
                caffeine: true,
                process: true,
            },
        })).map((product) => ({
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
