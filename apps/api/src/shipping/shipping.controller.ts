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
import { ShippingService } from './shipping.service';
import {
  CreateShippingRateDto,
  UpdateShippingRateDto,
} from './dto/shipping-rate.dto';
import { Roles } from 'src/common/decorator/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';

/**
 * Shipping tier management. Admin only.
 * Route prefix: /admin/shipping-rates
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/shipping-rates')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  findAll() {
    return this.shippingService.findAll();
  }

  @Post()
  create(@Body() dto: CreateShippingRateDto) {
    return this.shippingService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateShippingRateDto) {
    return this.shippingService.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.shippingService.deactivate(id);
  }
}
