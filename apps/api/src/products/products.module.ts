import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductService } from '../product/product.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';


@Module({
  imports: [],
  controllers: [ProductsController],
  providers: [ProductService, PrismaService, JwtAuthGuard, RolesGuard],
})
export class ProductsModule {}
