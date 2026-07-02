import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

/**
 * DTO for creating an inventory record.
 *
 * `available` is NOT included — it is calculated server-side as onHand - reserved.
 * The ValidationPipe (whitelist: true) strips any extra fields automatically.
 */
export class CreateInventoryDto {
  /**
   * FK to Batch. Must be a valid UUID.
   * One inventory record per batch (unique constraint on batchId in schema).
   */
  @IsUUID()
  @IsNotEmpty()
  batchId!: string;

  /**
   * Physical stock quantity for this batch.
   * Must be >= 0. `reserved` defaults to 0 on creation.
   */
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  onHand!: number;
}
