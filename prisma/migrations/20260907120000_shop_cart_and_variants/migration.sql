-- Add a `cart` state so draft carts are distinguishable from real unpaid orders.
-- Safe inside a transaction on PG12+ because the new value is not used in this migration.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'cart' BEFORE 'pending';

-- Products can carry their own image.
ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT;

-- Each variant declares the currency its priceCents is denominated in.
ALTER TABLE "ProductVariant" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'ETB';

-- Anonymous carts are found again by an opaque token.
ALTER TABLE "Order" ADD COLUMN "cartToken" TEXT;
CREATE UNIQUE INDEX "Order_cartToken_key" ON "Order"("cartToken");

-- A draft cart has no payment provider yet, and starts empty.
ALTER TABLE "Order" ALTER COLUMN "paymentProvider" DROP NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "totalCents" SET DEFAULT 0;
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'ETB';

-- Checkout contact + shipping details.
ALTER TABLE "Order" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Order" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Order" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingAddress" TEXT;
