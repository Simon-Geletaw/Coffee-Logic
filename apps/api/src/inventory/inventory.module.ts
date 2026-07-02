import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Inventory module — registers the controller, service, and Prisma provider.
 * Imported by AppModule to make all /admin/inventory routes available.
 */
@Module({
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService],
})
export class InventoryModule {}
