import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { Roles } from '../common/decorator/roles.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';

/**
 * Product variant (size + price) management. Admin only.
 * Route prefix: /admin/variants
 *
 *   GET    /admin/variants?productId=  — list variants, optionally per product
 *   POST   /admin/variants             — create a variant
 *   PATCH  /admin/variants/:id         — update weight/price/currency/sku/active
 *   DELETE /admin/variants/:id         — soft-delete (isActive = false)
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Get()
  findAll(@Query('productId') productId?: string) {
    return this.variantsService.findAll(productId);
  }

  @Post()
  create(@Body() dto: CreateVariantDto) {
    return this.variantsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.variantsService.update(id, dto);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.variantsService.softDelete(id);
  }
}
