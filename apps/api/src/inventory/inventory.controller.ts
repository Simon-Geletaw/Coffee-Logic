import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Roles } from '../common/decorator/roles.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';

/**
 * Inventory management endpoints.
 *
 * All routes require JWT authentication + admin role.
 * Route prefix: /admin/inventory
 *
 * Endpoints:
 *   GET    /admin/inventory            — list all inventory (with batch + product)
 *   GET    /admin/inventory/batch/:id  — get inventory by batch ID
 *   POST   /admin/inventory            — create inventory for a batch
 *   PATCH  /admin/inventory/:id        — adjust stock quantities
 *   DELETE /admin/inventory/:id        — soft-delete inventory (status = false)
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('batch/:batchId')
  findByBatchId(@Param('batchId') batchId: string) {
    return this.inventoryService.findByBatchId(batchId);
  }

  @Post()
  create(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.create(dto);
  }

  @Patch(':id')
  adjustStock(@Param('id') id: string, @Body() dto: UpdateInventoryDto) {
    return this.inventoryService.adjustStock(id, dto);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.inventoryService.softDelete(id);
  }
}
