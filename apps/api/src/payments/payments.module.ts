import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { ChapaService } from './chapa.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { StripePaymentsController } from './stripe-payments.controller';
import { PaymentSettlementService } from './payment-settlement.service';

@Module({
  controllers: [PaymentsController, StripePaymentsController],
  providers: [
    ChapaService,
    StripeService,
    PaymentSettlementService,
    PrismaService,
  ],
  exports: [ChapaService, StripeService],
})
export class PaymentsModule {}
