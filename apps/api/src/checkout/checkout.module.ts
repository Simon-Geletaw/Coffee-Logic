import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrdersModule } from 'src/orders/orders.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { ShippingModule } from 'src/shipping/shipping.module';

@Module({
  imports: [OrdersModule, PaymentsModule, ShippingModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, PrismaService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
