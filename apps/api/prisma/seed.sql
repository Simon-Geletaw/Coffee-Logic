-- ============================================================
-- Coffee Logic — one-shot seed (admin user + 5 products + stock)
-- Idempotent: safe to run multiple times.
-- Run:  docker compose exec -T postgres psql -U coffee -d coffee_logic < apps/api/prisma/seed.sql
-- ============================================================

-- ---------- 1) ADMIN USER ----------
-- email:    admin@coffee.dev
-- password: Admin123!   (bcrypt, cost 10)
INSERT INTO "User" ("id", "firstName", "lastName", "email", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Admin',
  'Coffee',
  'admin@coffee.dev',
  '$2b$10$JtXbEBlpCCaQl20HhSQ4WeoNKFH2gyCMg.qOVvJUHoXlT8JFQ8e0C',
  'admin',
  true,
  now(),
  now()
)
ON CONFLICT ("email") DO UPDATE
  SET "passwordHash" = EXCLUDED."passwordHash",
      "role"         = 'admin',
      "isActive"     = true,
      "updatedAt"    = now();

-- ---------- 2) PRODUCTS + VARIANTS + BATCH + STOCK ----------
-- Each product: 250g @ 450 ETB, 1kg @ 1600 ETB, one batch, 100 units available.

INSERT INTO "Product" ("id", "name", "description", "roastLevel", "grind", "origin", "process", "caffeine", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), p."name", p."description", p."roastLevel", p."grind", p."origin", p."process", p."caffeine", true, now(), now()
FROM (VALUES
  ('Yirgacheffe Sundried', 'Sun-dried heirloom beans from Yirgacheffe. Fruity, wine-like acidity with berry notes.', 'Medium', 'Whole Bean', 'Yirgacheffe', 'Natural', 'Caffeinated'),
  ('Sidamo Washed',        'Washed Sidamo with floral aroma, bright citrus and a clean finish.',                   'Medium', 'Whole Bean', 'Sidamo',      'Washed',  'Caffeinated'),
  ('Guji Honey',           'Honey-processed Guji. Syrupy body with caramel and stone-fruit sweetness.',            'Medium', 'Whole Bean', 'Guji',        'Honey',   'Caffeinated'),
  ('Harrar Classic',       'Classic dry-processed Harrar. Bold, earthy with blueberry and chocolate.',             'Dark',   'Whole Bean', 'Harrar',      'Natural', 'Caffeinated'),
  ('Limu Decaf',           'Swiss-water decaffeinated Limu. Smooth, mild with gentle cocoa notes.',                'Medium', 'Whole Bean', 'Limu',        'Washed',  'Decaf')
) AS p("name", "description", "roastLevel", "grind", "origin", "process", "caffeine")
WHERE NOT EXISTS (SELECT 1 FROM "Product" prod WHERE prod."name" = p."name");

-- Variants: 250g + 1kg for every product that has none yet
INSERT INTO "ProductVariant" ("id", "productId", "weightGrams", "priceCents", "currency", "isActive")
SELECT gen_random_uuid(), prod."id", v."weightGrams", v."priceCents", 'ETB', true
FROM "Product" prod
CROSS JOIN (VALUES (250, 45000), (1000, 160000)) AS v("weightGrams", "priceCents")
WHERE NOT EXISTS (
  SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = prod."id" AND pv."weightGrams" = v."weightGrams"
);

-- One fresh batch per product (roasted 7 days ago, expires in 90 days)
INSERT INTO "Batch" ("id", "productId", "batchCode", "roastDate", "expiresAt", "isActive")
SELECT gen_random_uuid(), prod."id",
       upper(replace(prod."name", ' ', '-')) || '-B01',
       now() - interval '7 days',
       now() + interval '90 days',
       true
FROM "Product" prod
WHERE NOT EXISTS (SELECT 1 FROM "Batch" b WHERE b."productId" = prod."id");

-- Stock: 100 units available for every batch that has no inventory row
INSERT INTO "Inventory" ("id", "batchId", "onHand", "reserved", "available", "status", "updatedAt")
SELECT gen_random_uuid(), b."id", 100, 0, 100, true, now()
FROM "Batch" b
WHERE NOT EXISTS (SELECT 1 FROM "Inventory" i WHERE i."batchId" = b."id");
