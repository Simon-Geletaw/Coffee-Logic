import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const SUPPORTED_CURRENCIES = ['ETB', 'USD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export class CreateVariantDto {
  @IsUUID('4', { message: 'productId must be a valid UUID' })
  productId!: string;

  @IsInt({ message: 'weightGrams must be a number' })
  @Min(1, { message: 'weightGrams must be at least 1' })
  @Max(100000, { message: 'weightGrams must not exceed 100000' })
  weightGrams!: number;

  @IsInt({ message: 'priceCents must be a number' })
  @Min(0, { message: 'priceCents cannot be negative' })
  priceCents!: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES, { message: 'currency must be ETB or USD' })
  currency?: SupportedCurrency;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
