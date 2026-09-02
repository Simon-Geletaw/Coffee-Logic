import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  batchCode!: string;

  @IsDateString()
  @IsNotEmpty()
  roastDate!: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
