import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('paymentProvider') paymentProvider?: string,
  ) {
    return this.ordersService.getAdminOrders(status, paymentProvider);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.getAdminOrder(id);
  }
}
