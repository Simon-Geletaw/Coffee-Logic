import { IsArray, IsInt, IsUUID, Min, Max } from 'class-validator';
export class CreateOrderDto {
  @IsArray()
  @IsUUID('4', { message: 'ProductVarientId must be a valid UUID' })
  ProductVarientId!: string[];
  @IsInt({ message: 'Quantity must be a number' })
  @IsArray()
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(20, { message: 'Quantity must not exceed 20' })
  quantity!: number[];
}
