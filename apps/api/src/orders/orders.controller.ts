import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/create-order.dto';

/**
 * Anonymous storefront cart. Public by design — shoppers have no accounts.
 *
 * A cart is an Order row in status cart | pending | failed, found again by
 * the opaque `x-cart-token` header. POST /cart/items mints that token on the
 * first add and returns it; the browser stores it and replays it thereafter.
 *
 *   GET    /cart                — current cart (empty shape when no token)
 *   POST   /cart/items          — add a variant; returns { cartToken, cart }
 *   PATCH  /cart/items/:itemId  — set a line quantity (0 removes the line)
 *   DELETE /cart/items/:itemId  — remove a line
 *   DELETE /cart                — empty the cart
 *   GET    /cart/orders/:id     — read back a placed order
 *
 * Checkout lives under /checkout (see CheckoutController).
 */
@Controller('cart')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getCart(@Headers('x-cart-token') cartToken?: string) {
    return this.ordersService.getCart(cartToken);
  }

  @Post('items')
  addItem(
    @Body() dto: AddCartItemDto,
    @Headers('x-cart-token') cartToken?: string,
  ) {
    return this.ordersService.addItem(cartToken, dto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-cart-token') cartToken?: string,
  ) {
    return this.ordersService.updateItem(cartToken, itemId, dto);
  }

  @Delete('items/:itemId')
  removeItem(
    @Param('itemId') itemId: string,
    @Headers('x-cart-token') cartToken?: string,
  ) {
    return this.ordersService.removeItem(cartToken, itemId);
  }

  @Delete()
  clearCart(@Headers('x-cart-token') cartToken?: string) {
    return this.ordersService.clearCart(cartToken);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }
}
