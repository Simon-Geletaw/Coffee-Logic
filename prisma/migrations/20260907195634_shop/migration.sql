-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ETB', 'USD');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "failureReason" TIMESTAMP(3),
ADD COLUMN     "paideAt" TIMESTAMP(3),
ADD COLUMN     "paymentExpiresAt" TIMESTAMP(3),
ADD COLUMN     "shippingcents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subtotalCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalWeightGrams" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "maxGrams" INTEGER NOT NULL,
    "cents" INTEGER NOT NULL,
    "label" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRate_currency_maxGrams_key" ON "ShippingRate"("currency", "maxGrams");
