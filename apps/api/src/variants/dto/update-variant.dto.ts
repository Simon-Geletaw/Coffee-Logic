import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from './create-variant.dto';

export class UpdateVariantDto {
  @IsOptional()
  @IsInt({ message: 'weightGrams must be a number' })
  @Min(1)
  @Max(100000)
  weightGrams?: number;

  @IsOptional()
  @IsInt({ message: 'priceCents must be a number' })
  @Min(0)
  priceCents?: number;

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
