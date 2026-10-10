import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service';

@Controller('payments/stripe')
export class StripePaymentsController {
  constructor(private readonly stripe: StripeService) {}

  @Get('verify/:sessionId')
  verify(@Param('sessionId') sessionId: string) {
    return this.stripe.verify(sessionId);
  }

  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!request.rawBody) throw new BadRequestException('Missing webhook body');
    return this.stripe.handleWebhook(request.rawBody, signature);
  }
}
