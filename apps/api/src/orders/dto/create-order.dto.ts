import { IsInt, IsUUID, Max, Min } from 'class-validator';

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
