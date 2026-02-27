import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductService } from '../product/product.service';
import { PrismaService } from 'src/prisma/prisma.service';


@Module({
  imports: [],
  controllers: [ProductsController],
  providers: [ProductService,PrismaService],
})
export class ProductsModule {}
