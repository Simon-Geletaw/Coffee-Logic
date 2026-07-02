import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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

  async findAll() {
    return this.prisma.batch.findMany({
      include: { product: { select: { id: true, name: true } } },
      orderBy: { roastDate: 'desc' },
    });
  }

  async remove(id: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Batch not found');
    await this.prisma.batch.delete({ where: { id } });
    return { id, status: 'deleted' as const };
  }
}
