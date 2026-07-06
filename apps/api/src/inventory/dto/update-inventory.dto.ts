import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * DTO for adjusting inventory quantities.
 *
 * All fields are optional (PATCH semantic — only send what changed).
 * The service enforces business rules:
 *   - onHand must never be < reserved (available would go negative)
 *   - available = onHand - reserved (calculated server-side)
 */
export class UpdateInventoryDto {
  /** New total physical stock. Must be >= 0 and >= current reserved. */
  @IsOptional()
  @IsInt()
  @Min(0)
  onHand?: number;

  /** New reserved quantity. Must be >= 0 and <= current onHand. */
  @IsOptional()
  @IsInt()
  @Min(0)
  reserved?: number;
}
