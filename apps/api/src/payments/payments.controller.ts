import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  Query,
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
  @HttpCode(200)
  async webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('x-chapa-signature') signature?: string,
    @Headers('chapa-signature') legacySignature?: string,
  ) {
    // Verification must run over the exact bytes Chapa signed, before any
    // JSON parsing normalises them.
    const rawBody = request.rawBody;

    if (
      !rawBody ||
      !this.chapa.verifyWebhookSignature(rawBody, signature, legacySignature)
    ) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = request.body as {
      id?: string;
      tx_ref?: string;
      status?: string;
    };
    return this.chapa.handleWebhook(event ?? {});
  }

  // Chapa's transaction callback is distinct from the signed dashboard webhook.
  // It is only a trigger: verification always queries Chapa with our secret key.
  @Get('callback')
  callback(@Query('tx_ref') txRef?: string, @Query('trx_ref') trxRef?: string) {
    const reference = txRef || trxRef;
    if (!reference)
      throw new BadRequestException('Missing transaction reference');
    return this.chapa.verify(reference);
  }

  @Get('verify/:txRef')
  verify(@Param('txRef') txRef: string) {
    return this.chapa.verify(txRef);
  }
}
