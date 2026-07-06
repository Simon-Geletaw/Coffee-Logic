import { Module } from '@nestjs/common';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BatchesController],
  providers: [BatchesService, PrismaService],
})
export class BatchesModule {}
