import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { ChapaService } from './chapa.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PaymentsController],
  providers: [ChapaService, PrismaService],
  exports: [ChapaService],
})
export class PaymentsModule {}