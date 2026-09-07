import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

/**
 *   POST /checkout/session          — cart → pending; returns { redirectUrl }
 *   GET  /checkout/status/:orderId  — polled by the return page
 *   POST /payments/:provider/webhook — provider callbacks (raw body)
 */
@Controller()
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  // Tighter than the global limit: opening provider sessions costs money and
  // API quota, and a human never legitimately clicks "Place order" 5×/minute.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('checkout/session')
  createSession(
    @Body() dto: CreateCheckoutSessionDto,
    @Headers('x-cart-token') cartToken?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    // Required, not optional: without it a network retry would open two
    // provider sessions and double-reserve stock (SRS FR-CO-007).
    if (
      !idempotencyKey ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 128
    ) {
      throw new BadRequestException(
        'Idempotency-Key header is required (8–128 characters)',
      );
    }
    return this.checkout.createSession(cartToken, dto, idempotencyKey);
  }

  @Get('checkout/status/:orderId')
  getStatus(@Param('orderId') orderId: string) {
    return this.checkout.getStatus(orderId);
  }

  // Providers retry in bursts; rate-limiting them would only delay `paid`.
  // Authentication is the signature, verified inside the service.
  @SkipThrottle()
  @HttpCode(200)
  @Post('payments/:provider/webhook')
  webhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.checkout.handleWebhook(
      provider,
      req.rawBody,
      req.headers as Record<string, string | string[] | undefined>,
    );
  }
}
