-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true;
