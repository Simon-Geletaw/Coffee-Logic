import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogCacheService } from './catalog-cache.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogCacheService, PrismaService],
  // Admin writes to products/variants invalidate the shop cache through this.
  exports: [CatalogCacheService],
})
export class CatalogModule {}
