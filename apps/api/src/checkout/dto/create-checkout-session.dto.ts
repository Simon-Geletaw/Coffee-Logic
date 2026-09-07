import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { PaymentProviderName } from 'src/payments/payment-provider.interface';

export const PAYMENT_PROVIDER_NAMES: PaymentProviderName[] = [
  'stripe',
  'chapa',
];

/** Contact + delivery details plus the chosen provider. Opens a payment session. */
export class CreateCheckoutSessionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  contactName!: string;

  @IsEmail({}, { message: 'contactEmail must be a valid email' })
  @MaxLength(160)
  contactEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @IsString()
  @MinLength(10, { message: 'shippingAddress is too short to deliver to' })
  @MaxLength(400)
  shippingAddress!: string;

  @IsIn(PAYMENT_PROVIDER_NAMES, {
    message: 'paymentProvider must be chapa or stripe',
  })
  paymentProvider!: PaymentProviderName;
}
