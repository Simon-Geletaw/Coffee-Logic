/*
  Warnings:

  - You are about to drop the column `paideAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shippingcents` on the `Order` table. All the data in the column will be lost.
  - The `currency` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currency` column on the `ProductVariant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `name` on the `ShippingRate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paymentIntentId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "paideAt",
DROP COLUMN "shippingcents",
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "shippingCents" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'ETB',
ALTER COLUMN "failureReason" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'ETB';

-- AlterTable
ALTER TABLE "ShippingRate" DROP COLUMN "name",
ALTER COLUMN "label" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentIntentId_key" ON "Order"("paymentIntentId");
