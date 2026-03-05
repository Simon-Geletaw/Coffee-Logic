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
    async updateProduct(id: string, updatesProduct: productAttribute = {}) {
        if (!id) {
            throw new (await import('@nestjs/common')).BadRequestException('Product id is required');
        }

        const existingProduct = await this.prisma.product.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,                description: true,
                roastLevel: true,
                grind: true,    
                origin: true,
                process: true,
                caffeine: true,
            },
        });
        if (!existingProduct) {
            throw new (await import('@nestjs/common')).NotFoundException('Product not found');
        }
        const updatedProduct = await this.prisma.product.update({
            where: { id:existingProduct.id },
            data: {
                name: updatesProduct?.name ?? existingProduct.name,
                roastLevel: updatesProduct?.roastLevel ?? existingProduct.roastLevel,
                grind: updatesProduct?.grind ?? existingProduct.grind,
                origin: updatesProduct?.origin ?? existingProduct.origin,
                process: updatesProduct?.process ?? existingProduct.process,
                caffeine: updatesProduct?.caffeine ?? existingProduct.caffeine,
                description: updatesProduct?.description ?? existingProduct.description,
            },
        });
        return updatedProduct;       
             }
        async deleteProduct(id: string) {
            if (!id) {
                throw new (await import('@nestjs/common')).BadRequestException('Product id is required');
            }
            const findtobeDeletedProduct = await this.prisma.product.findUnique({
                where: { id },
                select:{
                    id:true
                }
                
            });
            if (!findtobeDeletedProduct) {
                throw new (await import('@nestjs/common')).NotFoundException('Product not found');
            }
            const DeletedProduct=await this.prisma.product.update({
                where: { id: findtobeDeletedProduct.id },
                data: {isActive: false},});
            if (!DeletedProduct) {
                throw new (await import('@nestjs/common')).InternalServerErrorException('Failed to delete product');
            }
            if (!DeletedProduct.isActive) {
                return {
                    id: DeletedProduct.id,
                    name: DeletedProduct.name,
                    status: 'deleted' as const,
                };
            }
            

         

        }
        };