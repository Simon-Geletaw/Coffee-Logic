import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Local union so the seed doesn't depend on generated enum types at
// type-check time (a stale/un-generated client won't break the seed).
type UserRole = 'viewer' | 'operator' | 'manager' | 'admin';

/**
 * Complete database seed: products + variants + batches + stock + admin user.
 *
 * Run (from anywhere in the repo):
 *   pnpm -C apps/api exec prisma db seed
 *
 * Default admin login created by this seed:
 *   email:    admin@coffee.dev
 *   password: Admin123!
 *
 * Re-running is safe: existing products/batches are skipped, and the admin
 * user's password/role are reset to the values below.
 */

const prisma = new PrismaClient();

// ── Admin login ──────────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@coffee.dev';
const ADMIN_PASSWORD = 'Admin123!'; // min 6 chars, 1 upper, 1 lower, 1 number, 1 special
const ADMIN_ROLE: UserRole = 'admin';

// ── Catalog ──────────────────────────────────────────────────────────
const products = [
  {
    name: 'Yirgacheffe Sundried',
    description:
      'Bright, floral, and fruit-forward with notes of blueberry and jasmine.',
    roastLevel: 'light',
    grind: 'whole-bean',
    origin: 'Ethiopia',
    process: 'natural',
    caffeine: 'regular',
    sensoryProfile: { body: 'light', acidity: 'high', sweetness: 'high' },
    variants: [
      { weightGrams: 250, priceCents: 1200, sku: 'ETH-YIRG-250' },
      { weightGrams: 1000, priceCents: 4200, sku: 'ETH-YIRG-1000' },
    ],
  },
  {
    name: 'Sidamo Washed',
    description: 'Clean and citrusy with a delicate tea-like body.',
    roastLevel: 'light-medium',
    grind: 'whole-bean',
    origin: 'Ethiopia',
    process: 'washed',
    caffeine: 'regular',
    sensoryProfile: { body: 'medium', acidity: 'high', sweetness: 'medium' },
    variants: [
      { weightGrams: 250, priceCents: 1100, sku: 'ETH-SIDA-250' },
      { weightGrams: 1000, priceCents: 3900, sku: 'ETH-SIDA-1000' },
    ],
  },
  {
    name: 'Guji Honey',
    description: 'Syrupy sweetness with notes of stone fruit and caramel.',
    roastLevel: 'medium',
    grind: 'whole-bean',
    origin: 'Ethiopia',
    process: 'honey',
    caffeine: 'regular',
    sensoryProfile: { body: 'full', acidity: 'medium', sweetness: 'high' },
    variants: [
      { weightGrams: 250, priceCents: 1300, sku: 'ETH-GUJI-250' },
      { weightGrams: 1000, priceCents: 4500, sku: 'ETH-GUJI-1000' },
    ],
  },
  {
    name: 'Harrar Classic',
    description: 'Bold and winey with a heavy body and dark chocolate finish.',
    roastLevel: 'dark',
    grind: 'whole-bean',
    origin: 'Ethiopia',
    process: 'natural',
    caffeine: 'regular',
    sensoryProfile: { body: 'full', acidity: 'low', sweetness: 'medium' },
    variants: [
      { weightGrams: 250, priceCents: 1050, sku: 'ETH-HARR-250' },
      { weightGrams: 1000, priceCents: 3600, sku: 'ETH-HARR-1000' },
    ],
  },
  {
    name: 'Limu Decaf',
    description: 'Smooth and balanced, all the flavor without the caffeine.',
    roastLevel: 'medium',
    grind: 'whole-bean',
    origin: 'Ethiopia',
    process: 'washed',
    caffeine: 'decaf',
    sensoryProfile: { body: 'medium', acidity: 'medium', sweetness: 'medium' },
    variants: [{ weightGrams: 250, priceCents: 1250, sku: 'ETH-LIMU-DECAF-250' }],
  },
];

// ── Stock (per product) ──────────────────────────────────────────────
// Sellable units per product. The shop sums `available` across every
// active batch's inventory (see orders.service.availableUnits), so this
// is what makes products show as "in stock".
const UNITS_PER_PRODUCT = 100;
const ROASTED_DAYS_AGO = 7;
const SHELF_LIFE_DAYS = 90;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seedAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, role: ADMIN_ROLE, isActive: true },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: ADMIN_ROLE,
      firstName: 'Simon',
      lastName: 'Admin',
      isActive: true,
    },
  });

  console.log(
    `${existing ? 'Admin user updated' : 'Admin user created'}: ${user.email} (${user.role})`,
  );
  console.log(`  password: ${ADMIN_PASSWORD}`);
}

async function seedCatalog(): Promise<void> {
  const roastDate = new Date();
  roastDate.setDate(roastDate.getDate() - ROASTED_DAYS_AGO);
  const expiresAt = new Date(roastDate);
  expiresAt.setDate(expiresAt.getDate() + SHELF_LIFE_DAYS);

  let createdProducts = 0;
  let createdBatches = 0;

  for (const { variants, ...product } of products) {
    let productRecord = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (!productRecord) {
      productRecord = await prisma.product.create({
        data: {
          ...product,
          variants: { create: variants },
        },
      });
      createdProducts += 1;
    }

    // Every product needs an active batch with stock, otherwise the shop
    // treats it as out of stock (sum of `available` across active batches).
    const hasStockedBatch = await prisma.inventory.findFirst({
      where: {
        status: true,
        batch: { productId: productRecord.id, isActive: true },
      },
    });

    if (!hasStockedBatch) {
      const batch = await prisma.batch.create({
        data: {
          productId: productRecord.id,
          batchCode: `${slugify(product.name).toUpperCase()}-B01`,
          roastDate,
          expiresAt,
          isActive: true,
          inventory: {
            create: {
              onHand: UNITS_PER_PRODUCT,
              reserved: 0,
              available: UNITS_PER_PRODUCT, // available = onHand - reserved
              status: true,
            },
          },
        },
      });
      createdBatches += 1;
      console.log(
        `  + stock: ${product.name} -> batch ${batch.batchCode}, ${UNITS_PER_PRODUCT} units available`,
      );
    }
  }

  console.log(
    `Catalog: ${createdProducts} product(s) created, ${createdBatches} batch(es) stocked.`,
  );
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedCatalog();
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

