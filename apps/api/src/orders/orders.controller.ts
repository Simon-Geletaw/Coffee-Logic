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
import {
  AddCartItemDto,
  CheckoutDto,
  UpdateCartItemDto,
} from './dto/create-order.dto';

/**
 * Anonymous storefront cart. Public by design — shoppers have no accounts.
 *
 * A cart is an Order row with status 'cart', found again by the opaque
 * `x-cart-token` header. POST /cart/items mints that token on the first add
 * and returns it; the browser stores it and replays it on later requests.
 *
 *   GET    /cart                — current cart (empty shape when no token)
 *   POST   /cart/items          — add a variant; returns { cartToken, cart }
 *   PATCH  /cart/items/:itemId  — set a line quantity (0 removes the line)
 *   DELETE /cart/items/:itemId  — remove a line
 *   DELETE /cart                — empty the cart
 *   POST   /cart/checkout       — cart -> pending order
 *   GET    /cart/orders/:id     — read back a placed order
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

  @Post('checkout')
  checkout(
    @Body() dto: CheckoutDto,
    @Headers('x-cart-token') cartToken?: string,
  ) {
    return this.ordersService.checkout(cartToken, dto);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }
}
