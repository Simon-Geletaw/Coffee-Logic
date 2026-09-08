import { Module } from '@nestjs/common';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { CatalogModule } from 'src/catalog/catalog.module';

@Module({
  imports: [CatalogModule],
  controllers: [VariantsController],
  providers: [VariantsService, PrismaService, JwtAuthGuard, RolesGuard],
})
export class VariantsModule {}
