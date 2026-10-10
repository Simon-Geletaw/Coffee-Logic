-- The live database had "ProductVariant"."currency" and "Order"."currency"
-- as the native enum type "Currency", while the Prisma schema declares them
-- as String @default("ETB"). Prisma failed to deserialize enum-typed values
-- (e.g. 'USD') into String fields, breaking GET /catalog/products with:
-- "Error converting field "currency" of expected non-nullable type "String",
-- found incompatible value of "USD"".
-- Convert both columns back to TEXT to match the schema and migration history.

ALTER TABLE "ProductVariant" ALTER COLUMN "currency" TYPE TEXT USING "currency"::text;
ALTER TABLE "ProductVariant" ALTER COLUMN "currency" SET DEFAULT 'ETB';

ALTER TABLE "Order" ALTER COLUMN "currency" TYPE TEXT USING "currency"::text;
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'ETB';
