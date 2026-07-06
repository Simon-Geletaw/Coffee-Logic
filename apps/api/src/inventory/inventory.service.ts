import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

/**
 * Inventory business logic:
 *
 * Business rules enforced here:
 * 1. One inventory record per batch (batchId is unique in schema).
 * 2. `available` is always calculated as `onHand - reserved` — never set directly.
 * 3. onHand must never drop below reserved (avoids negative available).
 * 4. Soft-delete via `status = false` instead of hard delete.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an inventory record for a batch.
   *
   * Steps:
   * 1. Verify batch exists (404 if not).
   * 2. Check no inventory record exists for this batch (409 if duplicate).
   * 3. Create with onHand = dto.onHand, reserved = 0, available = onHand.
   */
  async create(dto: CreateInventoryDto) {
    // Step 1: Validate batch exists
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${dto.batchId} not found`);
    }

    // Step 2: Check for duplicate
    const existing = await this.prisma.inventory.findUnique({
      where: { batchId: dto.batchId },
    });
    if (existing) {
      throw new ConflictException(
        `Inventory already exists for batch ${dto.batchId}`,
      );
    }

    // Step 3: Create with calculated available
    return this.prisma.inventory.create({
      data: {
        batchId: dto.batchId,
        onHand: dto.onHand,
        reserved: 0,
        available: dto.onHand, // available = onHand - 0
      },
      include: {
        batch: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });
  }

  /**
   * Lists all inventory records with their batch and product info.
   * Does NOT filter by status — the frontend decides what to show.
   */
  async findAll() {
    return this.prisma.inventory.findMany({
      include: {
        batch: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Finds a single inventory record by its batch ID.
   */
  async findByBatchId(batchId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { batchId },
      include: {
        batch: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });
    if (!inventory) {
      throw new NotFoundException(
        `Inventory not found for batch ${batchId}`,
      );
    }
    return inventory;
  }

  /**
   * Adjusts inventory quantities (onHand and/or reserved).
   *
   * Uses a Prisma $transaction to atomically:
   * 1. Read the current inventory record.
   * 2. Validate business rules.
   * 3. Update with new values + recalculated available.
   *
   * This prevents race conditions where two simultaneous requests
   * could read stale data and produce inconsistent state.
   */
  async adjustStock(id: string, dto: UpdateInventoryDto) {
    return this.prisma.$transaction(async (tx) => {
      // Read current state inside the transaction
      const inventory = await tx.inventory.findUnique({ where: { id } });
      if (!inventory) {
        throw new NotFoundException(`Inventory record ${id} not found`);
      }

      // Merge incoming values with current values
      const newOnHand = dto.onHand ?? inventory.onHand;
      const newReserved = dto.reserved ?? inventory.reserved;

      // Business rule: reserved cannot exceed onHand
      if (newReserved > newOnHand) {
        throw new BadRequestException(
          `Cannot reserve ${newReserved} when only ${newOnHand} are on hand`,
        );
      }

      // Calculate available
      const newAvailable = newOnHand - newReserved;

      // Update inside the transaction
      return tx.inventory.update({
        where: { id },
        data: {
          onHand: newOnHand,
          reserved: newReserved,
          available: newAvailable,
        },
        include: {
          batch: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      });
    });
  }

  /**
   * Soft-deletes an inventory record by setting status = false.
   * The record is preserved in the DB but filtered out by default.
   */
  async softDelete(id: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
    });
    if (!inventory) {
      throw new NotFoundException(`Inventory record ${id} not found`);
    }

    return this.prisma.inventory.update({
      where: { id },
      data: { status: false },
    });
  }
}
