import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  roastLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  grind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  origin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  caffeine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  process?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
