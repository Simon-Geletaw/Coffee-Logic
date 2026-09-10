import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const PAYMENT_PROVIDERS = ['chapa', 'stripe'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

/** Add one variant to the cart, or increase its quantity if already present. */
export class AddCartItemDto {
  @IsUUID('4', { message: 'productVariantId must be a valid UUID' })
  productVariantId!: string;

  @IsInt({ message: 'quantity must be a number' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Max(20, { message: 'quantity must not exceed 20' })
  quantity!: number;
}

/** Set the absolute quantity of an existing cart line. */
export class UpdateCartItemDto {
  @IsInt({ message: 'quantity must be a number' })
  @Min(0, { message: 'quantity cannot be negative' })
  @Max(20, { message: 'quantity must not exceed 20' })
  quantity!: number;
}

/** Contact + shipping details that turn a cart into a pending order. */
export class CheckoutDto {
  @IsString()
  @MaxLength(120)
  contactName!: string;

  @IsString()
  @MaxLength(160)
  contactEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @IsString()
  @MaxLength(400)
  shippingAddress!: string;

  @IsIn(PAYMENT_PROVIDERS, {
    message: 'paymentProvider must be chapa or stripe',
  })
  paymentProvider!: PaymentProvider;
}
