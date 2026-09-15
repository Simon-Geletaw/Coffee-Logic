import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ChapaService } from './chapa.service';

/**
 * Chapa endpoints. No global prefix is used, so these live at
 *   POST /payments/chapa/webhook      — Chapa's callback_url (source of truth)
 *   GET  /payments/chapa/verify/:ref  — return-page verification
 */
@Controller('payments/chapa')
export class PaymentsController {
  constructor(private readonly chapa: ChapaService) {}

  @Post('webhook')
  async webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('x-chapa-signature') signature?: string,
  ) {
    // Verification must run over the exact bytes Chapa signed, before any
    // JSON parsing normalises them.
    const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(request.body));

    if (!this.chapa.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = request.body as {
      id?: string;
      tx_ref?: string;
      status?: string;
    };
    return this.chapa.handleWebhook(event ?? {});
  }

  @Get('verify/:txRef')
  verify(@Param('txRef') txRef: string) {
    return this.chapa.verify(txRef);
  }
}