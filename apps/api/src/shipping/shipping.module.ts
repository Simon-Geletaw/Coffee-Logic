import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, PrismaService, JwtAuthGuard, RolesGuard],
  // Exported so the cart can price shipping while it recalculates totals.
  exports: [ShippingService],
})
export class ShippingModule {}
