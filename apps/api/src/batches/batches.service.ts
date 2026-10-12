import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBatchDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    return this.prisma.batch.create({
      data: {
        productId: dto.productId,
        batchCode: dto.batchCode,
        roastDate: new Date(dto.roastDate),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: { product: { select: { id: true, name: true } } },
    });
  }

  /**
   * Returns only active (non-deleted) batches.
   * Soft-deleted batches are hidden from the default listing.
   */
  async findAll() {
    return this.prisma.batch.findMany({
      where: { isActive: true },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { roastDate: 'desc' },
    });
  }

  /**
   * Soft-deletes a batch (sets isActive = false).
   * If the batch has an inventory record, also soft-deletes it.
   * Uses $transaction to ensure atomicity — either both update or neither.
   */
  async remove(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: { inventory: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Soft-delete the batch
      await tx.batch.update({
        where: { id },
        data: { isActive: false },
      });

      // Cascade: if inventory exists, soft-delete it too
      if (batch.inventory) {
        await tx.inventory.update({
          where: { id: batch.inventory.id },
          data: { status: false },
        });
      }
    });

    return { id, status: 'deleted' as const };
  }
}
