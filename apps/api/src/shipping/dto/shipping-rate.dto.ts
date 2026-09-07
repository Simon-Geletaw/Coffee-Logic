import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Currency } from '@prisma/client';

export class CreateShippingRateDto {
  @IsEnum(Currency, { message: 'currency must be ETB or USD' })
  currency!: Currency;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxGrams!: number;

  @IsInt()
  @Min(0)
  cents!: number;

  @IsString()
  @MaxLength(60)
  label!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShippingRateDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxGrams?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
