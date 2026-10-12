import { Module } from '@nestjs/common';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';

@Module({
  controllers: [VariantsController],
  providers: [VariantsService, PrismaService, JwtAuthGuard, RolesGuard],
})
export class VariantsModule {}
